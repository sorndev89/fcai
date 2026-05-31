import { Router } from 'express';
import { db } from '../config/db';
import { payments, bankAccounts, packages, users, tokenBundles } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ensureTokenBundlesReady, getActiveTokenBundles } from '../utils/token-bundles';

const router = Router();

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
  try {
    const userId = req.user!.userId;
    const { packageId, amount, slipBase64, slipName, paymentType = 'package', tokenAmount, tokenBundleId } = req.body;

    if (!slipBase64 || !slipName) {
      return res.status(400).json({ error: 'ກະລຸນາອັບໂຫຼດໃບບິນໂອນເງິນ (Slip)' });
    }

    const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const user = userResult[0];
    if (!user) {
      return res.status(404).json({ error: 'ບໍ່ພົບຂໍ້ມູນຜູ້ໃຊ້' });
    }

    const resolvedPackageId = packageId || user.packageId;
    if (paymentType === 'token_topup') {
      const amountNumber = Number(amount);
      const tokenBundle = Number(tokenAmount || 0);

      if (!resolvedPackageId) {
        return res.status(400).json({ error: 'ບໍ່ພົບແພັກເກດປັດຈຸບັນ' });
      }

      await ensureTokenBundlesReady();

      const bundleRows = await db
        .select()
        .from(tokenBundles)
        .where(
          and(
            eq(tokenBundles.isActive, true),
            tokenBundleId ? eq(tokenBundles.id, String(tokenBundleId)) : eq(tokenBundles.tokenAmount, tokenBundle)
          )
        )
        .limit(1);

      if (bundleRows.length === 0) {
        return res.status(400).json({ error: 'ບໍ່ພົບຊຸດ token top-up ທີ່ເລືອກ' });
      }

      const bundle = bundleRows[0];
      if (amountNumber !== Number(bundle.price)) {
        return res.status(400).json({ error: 'ຈຳນວນເງິນບໍ່ຕົງກັບຊຸດ token top-up' });
      }
    } else {
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

    // Save base64 slip to file system
    let slipUrl = '';
    try {
      const base64Data = slipBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const uniqueFileName = `${crypto.randomUUID()}-${slipName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      const uploadDir = path.resolve(__dirname, '../../uploads/slips');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, uniqueFileName);
      fs.writeFileSync(filePath, buffer);
      
      slipUrl = `/uploads/slips/${uniqueFileName}`;
    } catch (uploadError) {
      console.error('Slip upload write error:', uploadError);
      return res.status(500).json({ error: 'ເກີດຂໍ້ຜິດພາດໃນການບັນທຶກຮູບພາບໃບບິນ' });
    }

    const paymentId = crypto.randomUUID();

    // Create a pending payment
    await db.insert(payments).values({
      id: paymentId,
      userId,
      packageId: resolvedPackageId,
      paymentType,
      tokenAmount: Number(tokenAmount || 0),
      amount: amount.toString(),
      status: 'pending',
      slipUrl,
    });

    res.status(201).json({
      message: 'ສົ່ງຫຼັກຖານການຊຳລະເງິນສຳເລັດ, ກະລຸນາລໍຖ້າຜູ້ດູແລລະບົບກວດສອບ',
      paymentId,
    });
  } catch (error) {
    console.error('Checkout payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. Get latest payment request status of user
router.get('/my-status', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    
    // Find the newest payment record for this user
    const latestPayment = await db
      .select()
      .from(payments)
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.createdAt))
      .limit(1);

    if (latestPayment.length === 0) {
      return res.json({ hasPending: false, latest: null });
    }

    const pay = latestPayment[0];
    const pkg = await db.select().from(packages).where(eq(packages.id, pay.packageId)).limit(1);
    
    res.json({
      hasPending: pay.status === 'pending',
      latest: {
        id: pay.id,
        status: pay.status,
        paymentType: pay.paymentType,
        tokenAmount: Number(pay.tokenAmount || 0),
        amount: Number(pay.amount),
        createdAt: pay.createdAt,
        packageName: pkg[0]?.name || 'Unknown',
        slipUrl: pay.slipUrl,
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
    
    // Fetch packages to map packageId to packageName
    const pkgs = await db.select().from(packages);
    const pkgsMap = new Map(pkgs.map((p) => [p.id, p.name]));

    const history = await db
      .select()
      .from(payments)
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.createdAt));

    const result = history.map((pay) => ({
      id: pay.id,
      status: pay.status,
      paymentType: pay.paymentType,
      tokenAmount: Number(pay.tokenAmount || 0),
      amount: Number(pay.amount),
      createdAt: pay.createdAt,
      packageName: pkgsMap.get(pay.packageId) || 'Unknown',
      slipUrl: pay.slipUrl,
      paymentDate: pay.paymentDate,
    }));

    res.json(result);
  } catch (error) {
    console.error('Fetch payment history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
