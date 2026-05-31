import { Router } from 'express';
import { db, poolConnection } from '../config/db';
import { payments, bankAccounts, packages, users, tokenBundles } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getActiveTokenBundles } from '../utils/token-bundles';
import { ensureUploadsDir, toPublicUploadPath } from '../utils/uploads';

const router = Router();

function summarizeError(error: any) {
  return {
    code: error?.code || error?.errno || error?.name || 'UNKNOWN_ERROR',
    message: error?.sqlMessage || error?.message || 'Unknown error',
    sqlState: error?.sqlState,
  };
}

function checkoutErrorResponse(stage: string, error: any) {
  const summary = summarizeError(error);
  return {
    error: `ຊຳລະເງິນບໍ່ສຳເລັດ: ${summary.message}`,
    stage,
    code: summary.code,
    sqlState: summary.sqlState,
  };
}

async function insertPaymentRaw(values: Record<string, any>) {
  const columns = Object.keys(values);
  const columnSql = columns.map((column) => `\`${column}\``).join(', ');
  const placeholderSql = columns.map(() => '?').join(', ');
  await poolConnection.execute(
    `INSERT INTO \`payments\` (${columnSql}) VALUES (${placeholderSql})`,
    columns.map((column) => values[column])
  );
}

let paymentsColumnsPromise: Promise<Record<string, boolean>> | null = null;

async function getPaymentsColumnFlags() {
  if (!paymentsColumnsPromise) {
    paymentsColumnsPromise = poolConnection
      .query(
        `
          SELECT COLUMN_NAME AS columnName
          FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'payments'
        `
      )
      .then(([rows]: any) => {
        const names = new Set((rows || []).map((row: any) => String(row.columnName)));
        return {
          paymentType: names.has('payment_type'),
          tokenAmount: names.has('token_amount'),
          recordedBy: names.has('recorded_by'),
          paymentDate: names.has('payment_date'),
          slipUrl: names.has('slip_url'),
        };
      })
      .catch((error) => {
        paymentsColumnsPromise = null;
        throw error;
      });
  }

  return paymentsColumnsPromise;
}

let userPackageColumnPromise: Promise<boolean> | null = null;

async function hasUserPackageColumn() {
  if (!userPackageColumnPromise) {
    userPackageColumnPromise = poolConnection
      .query(
        `
          SELECT COUNT(*) AS count
          FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'users'
            AND COLUMN_NAME = 'package_id'
        `
      )
      .then(([rows]: any) => Number(rows?.[0]?.count || 0) > 0)
      .catch((error) => {
        userPackageColumnPromise = null;
        throw error;
      });
  }

  return userPackageColumnPromise;
}

function buildUserSelect(includePackageId: boolean) {
  const select: Record<string, any> = {
    id: users.id,
  };

  if (includePackageId) {
    select.packageId = users.packageId;
  }

  return select;
}

// Apply authentication middleware to all sub-routes
router.use(authenticateToken as any);

// 0. Get active token top-up bundles
router.get('/token-bundles', async (req: AuthenticatedRequest, res) => {
  try {
    const bundles = await getActiveTokenBundles();
    res.json(bundles);
  } catch (error) {
    console.error('Fetch token bundles error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 1. Get all active bank accounts for checkout
router.get('/active-banks', async (req: AuthenticatedRequest, res) => {
  try {
    const activeBanks = await db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.isActive, true));
    res.json(activeBanks);
  } catch (error) {
    console.error('Fetch active banks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. Submit payment checkout (upload transfer slip)
router.post('/checkout', async (req: AuthenticatedRequest, res) => {
  let stage = 'start';
  try {
    stage = 'read_request';
    const userId = req.user!.userId;
    const { packageId, amount, slipBase64, slipName, paymentType = 'package', tokenAmount, tokenBundleId } = req.body;

    if (!slipBase64 || !slipName) {
      return res.status(400).json({ error: 'ກະລຸນາອັບໂຫຼດໃບບິນໂອນເງິນ (Slip)' });
    }

    stage = 'fetch_user';
    const userResult = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
    const user = userResult[0];
    if (!user) {
      return res.status(404).json({ error: 'ບໍ່ພົບຂໍ້ມູນຜູ້ໃຊ້' });
    }

    const resolvedPackageId = packageId || '';
    if (paymentType === 'token_topup') {
      stage = 'validate_token_bundle';
      const amountNumber = Number(amount);
      const tokenBundle = Number(tokenAmount || 0);

      if (!resolvedPackageId) {
        return res.status(400).json({ error: 'ບໍ່ພົບແພັກເກດປັດຈຸບັນ' });
      }

      const activeBundles = await getActiveTokenBundles();
      const bundle = activeBundles.find((item) =>
        tokenBundleId ? item.id === String(tokenBundleId) : Number(item.tokenAmount) === tokenBundle
      );

      if (!bundle) {
        return res.status(400).json({ error: 'ບໍ່ພົບຊຸດ token top-up ທີ່ເລືອກ' });
      }

      if (amountNumber !== Number(bundle.price)) {
        return res.status(400).json({ error: 'ຈຳນວນເງິນບໍ່ຕົງກັບຊຸດ token top-up' });
      }
    } else {
      stage = 'validate_package';
      if (!resolvedPackageId || !amount) {
        return res.status(400).json({ error: 'ກະລຸນາເລືອກແພັກເກດ ແລະ ລະບຸຈຳນວນເງິນ' });
      }

      // Verify package exists and is active
      const targetPkg = await db.select().from(packages).where(eq(packages.id, resolvedPackageId)).limit(1);
      if (targetPkg.length === 0) {
        return res.status(400).json({ error: 'ບໍ່ພົບແພັກເກດທີ່ເລືອກ' });
      }
      if (!targetPkg[0].isActive) {
        return res.status(400).json({ error: 'ແພັກເກດນີ້ບໍ່ສາມາດໃຊ້ງານໄດ້' });
      }
    }

    // Save base64 slip to file system; fall back to null if the runtime cannot write files
    let slipUrl: string | null = null;
    try {
      stage = 'save_slip';
      const base64Data = slipBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const uniqueFileName = `${crypto.randomUUID()}-${slipName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      const uploadDir = ensureUploadsDir('slips');

      const filePath = path.join(uploadDir, uniqueFileName);
      fs.writeFileSync(filePath, buffer);
      
      slipUrl = toPublicUploadPath('slips', uniqueFileName);
    } catch (uploadError) {
      console.warn('Slip upload write fallback to null:', uploadError);
      slipUrl = null;
    }

    stage = 'insert_payment';
    const paymentId = crypto.randomUUID();

    const insertCandidates: Record<string, any>[] = [
      {
        id: paymentId,
        user_id: userId,
        package_id: resolvedPackageId,
        payment_type: paymentType,
        token_amount: Number(tokenAmount || 0),
        amount: amount.toString(),
        status: 'pending',
        ...(slipUrl ? { slip_url: slipUrl } : {}),
      },
      {
        id: paymentId,
        user_id: userId,
        package_id: resolvedPackageId,
        amount: amount.toString(),
        status: 'pending',
        ...(slipUrl ? { slip_url: slipUrl } : {}),
      },
      {
        id: paymentId,
        user_id: userId,
        package_id: resolvedPackageId,
        amount: amount.toString(),
        status: 'pending',
      },
      {
        id: paymentId,
        user_id: userId,
        amount: amount.toString(),
        status: 'pending',
      },
    ];

    let inserted = false;
    let lastInsertError: unknown = null;
    for (const paymentValues of insertCandidates) {
      try {
        await insertPaymentRaw(paymentValues);
        inserted = true;
        break;
      } catch (insertError: any) {
        lastInsertError = insertError;
        const retryableCodes = new Set([
          'ER_BAD_FIELD_ERROR',
          'ER_NO_SUCH_TABLE',
          'ER_NO_DEFAULT_FOR_FIELD',
          'ER_BAD_NULL_ERROR',
          'ER_DATA_TOO_LONG',
          'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD',
          'ER_NO_REFERENCED_ROW',
          'ER_NO_REFERENCED_ROW_2',
        ]);
        if (!retryableCodes.has(String(insertError?.code))) {
          throw insertError;
        }
      }
    }

    if (!inserted) {
      throw lastInsertError || new Error('Failed to insert payment record');
    }

    res.status(201).json({
      message: 'ສົ່ງຫຼັກຖານການຊຳລະເງິນສຳເລັດ, ກະລຸນາລໍຖ້າຜູ້ດູແລລະບົບກວດສອບ',
      paymentId,
    });
  } catch (error) {
    console.error(`Checkout payment error at ${stage}:`, error);
    res.status(500).json(checkoutErrorResponse(stage, error));
  }
});

// 3. Get latest payment request status of user
router.get('/my-status', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const paymentCols = await getPaymentsColumnFlags();
    const hasPackageColumn = await hasUserPackageColumn();
    
    // Find the newest payment record for this user
    const paymentSelect: Record<string, any> = {
      id: payments.id,
      userId: payments.userId,
      amount: payments.amount,
      status: payments.status,
      createdAt: payments.createdAt,
    };
    if (hasPackageColumn) paymentSelect.packageId = payments.packageId;
    if (paymentCols.paymentType) paymentSelect.paymentType = payments.paymentType;
    if (paymentCols.tokenAmount) paymentSelect.tokenAmount = payments.tokenAmount;
    if (paymentCols.paymentDate) paymentSelect.paymentDate = payments.paymentDate;
    if (paymentCols.slipUrl) paymentSelect.slipUrl = payments.slipUrl;

    const latestPayment = await db
      .select(paymentSelect)
      .from(payments)
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.createdAt))
      .limit(1);

    if (latestPayment.length === 0) {
      return res.json({ hasPending: false, latest: null });
    }

    const pay = latestPayment[0];
    const pkg = hasPackageColumn && pay.packageId
      ? await db.select({ name: packages.name }).from(packages).where(eq(packages.id, pay.packageId)).limit(1)
      : [];
    
    res.json({
      hasPending: pay.status === 'pending',
      latest: {
        id: pay.id,
        status: pay.status,
        paymentType: paymentCols.paymentType ? pay.paymentType : 'package',
        tokenAmount: paymentCols.tokenAmount ? Number(pay.tokenAmount || 0) : 0,
        amount: Number(pay.amount),
        createdAt: pay.createdAt,
        packageName: pkg[0]?.name || 'Unknown',
        slipUrl: paymentCols.slipUrl ? pay.slipUrl : null,
      }
    });
  } catch (error) {
    console.error('Fetch payment status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 4. Get all payment history of user
router.get('/my-history', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const paymentCols = await getPaymentsColumnFlags();
    const hasPackageColumn = await hasUserPackageColumn();
    
    // Fetch packages to map packageId to packageName
    const pkgs = hasPackageColumn ? await db.select().from(packages) : [];
    const pkgsMap = new Map(pkgs.map((p) => [p.id, p.name]));

    const paymentSelect: Record<string, any> = {
      id: payments.id,
      userId: payments.userId,
      amount: payments.amount,
      status: payments.status,
      createdAt: payments.createdAt,
    };
    if (hasPackageColumn) paymentSelect.packageId = payments.packageId;
    if (paymentCols.paymentType) paymentSelect.paymentType = payments.paymentType;
    if (paymentCols.tokenAmount) paymentSelect.tokenAmount = payments.tokenAmount;
    if (paymentCols.paymentDate) paymentSelect.paymentDate = payments.paymentDate;
    if (paymentCols.slipUrl) paymentSelect.slipUrl = payments.slipUrl;

    const history = await db
      .select(paymentSelect)
      .from(payments)
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.createdAt));

    const result = history.map((pay) => ({
      id: pay.id,
      status: pay.status,
      paymentType: paymentCols.paymentType ? pay.paymentType : 'package',
      tokenAmount: paymentCols.tokenAmount ? Number(pay.tokenAmount || 0) : 0,
      amount: Number(pay.amount),
      createdAt: pay.createdAt,
      packageName: hasPackageColumn ? (pkgsMap.get(pay.packageId) || 'Unknown') : 'Unknown',
      slipUrl: paymentCols.slipUrl ? pay.slipUrl : null,
      paymentDate: paymentCols.paymentDate ? pay.paymentDate : null,
    }));

    res.json(result);
  } catch (error) {
    console.error('Fetch payment history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
