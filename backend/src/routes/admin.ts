import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../config/db';
import { users, packages, payments, pages, bankAccounts, aiConfig, tokenBundles } from '../db/schema';
import { eq, ne, and, asc, count, desc, sql } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { poolConnection } from '../config/db';
import { ensureTokenBundlesReady, getAllTokenBundles } from '../utils/token-bundles';
import { ensureUploadsDir, toPublicUploadPath } from '../utils/uploads';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fb-chatbot-super-secret-key-12345';

let bonusTokensColumnPromise: Promise<boolean> | null = null;
let userPackageColumnPromise: Promise<boolean> | null = null;

async function hasBonusTokensColumn() {
  if (!bonusTokensColumnPromise) {
    bonusTokensColumnPromise = poolConnection
      .query(
        `
          SELECT COUNT(*) AS count
          FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'users'
            AND COLUMN_NAME = 'bonus_tokens'
        `
      )
      .then(([rows]: any) => Number(rows?.[0]?.count || 0) > 0)
      .catch((error) => {
        bonusTokensColumnPromise = null;
        throw error;
      });
  }

  return bonusTokensColumnPromise;
}

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

function summarizeError(error: any) {
  return {
    code: error?.code || error?.errno || error?.name || 'UNKNOWN_ERROR',
    message: error?.sqlMessage || error?.message || 'Unknown error',
    sqlState: error?.sqlState,
  };
}

function adminPaymentErrorResponse(action: string, error: any) {
  const summary = summarizeError(error);
  return {
    error: `${action} ບໍ່ສຳເລັດ: ${summary.message}`,
    code: summary.code,
    sqlState: summary.sqlState,
  };
}

async function getPaymentByIdRaw(id: string) {
  const paymentCols = await getPaymentsColumnFlags();
  const selectColumns = [
    '`id`',
    '`user_id` AS `userId`',
    '`package_id` AS `packageId`',
    '`amount`',
    '`status`',
    '`created_at` AS `createdAt`',
  ];

  if (paymentCols.paymentType) selectColumns.push('`payment_type` AS `paymentType`');
  if (paymentCols.tokenAmount) selectColumns.push('`token_amount` AS `tokenAmount`');
  if (paymentCols.recordedBy) selectColumns.push('`recorded_by` AS `recordedBy`');
  if (paymentCols.paymentDate) selectColumns.push('`payment_date` AS `paymentDate`');
  if (paymentCols.slipUrl) selectColumns.push('`slip_url` AS `slipUrl`');

  const [rows]: any = await poolConnection.execute(
    `SELECT ${selectColumns.join(', ')} FROM \`payments\` WHERE \`id\` = ? LIMIT 1`,
    [id]
  );

  return rows?.[0] || null;
}

async function updatePaymentStatusRaw(id: string, status: 'paid' | 'rejected', adminId: string | null) {
  const paymentCols = await getPaymentsColumnFlags();
  const assignments = ['`status` = ?'];
  const values: any[] = [status];

  if (paymentCols.paymentDate && status === 'paid') {
    assignments.push('`payment_date` = ?');
    values.push(new Date());
  }

  if (paymentCols.recordedBy) {
    assignments.push('`recorded_by` = ?');
    values.push(adminId);
  }

  values.push(id);
  await poolConnection.execute(
    `UPDATE \`payments\` SET ${assignments.join(', ')} WHERE \`id\` = ?`,
    values
  );
}

interface AdminRequest extends Request {
  user?: {
    userId: string;
    email: string;
    name: string;
    role: string;
  };
}

// Admin Authorization Middleware
function requireAdmin(req: AdminRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err || !decoded || decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Admin role required' });
    }
    req.user = decoded;
    next();
  });
}

async function resolveActiveAiConfigId() {
  const activeConfigs = await db.select({ id: aiConfig.id }).from(aiConfig).where(eq(aiConfig.isActive, true)).limit(1);
  return activeConfigs[0]?.id || null;
}

async function validateActiveAiConfigId(aiConfigId?: string | null) {
  if (!aiConfigId) {
    return resolveActiveAiConfigId();
  }

  const configs = await db
    .select({ id: aiConfig.id })
    .from(aiConfig)
    .where(eq(aiConfig.id, aiConfigId))
    .limit(1);

  return configs[0]?.id || null;
}

// 1. Fetch Tenants list (excludes the admin user itself)
router.get('/tenants', requireAdmin as any, async (req: any, res: Response) => {
  try {
    const includeBonusTokens = await hasBonusTokensColumn();
    const includePackageId = await hasUserPackageColumn();
    const tenants = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        ...(includePackageId ? { packageId: users.packageId } : {}),
        ...(includeBonusTokens ? { bonusTokens: users.bonusTokens } : {}),
        createdAt: users.createdAt,
      })
      .from(users)
      .where(ne(users.role, 'admin'));
    const normalized = tenants.map((tenant: any) => ({
      ...tenant,
      bonusTokens: includeBonusTokens ? Number(tenant.bonusTokens || 0) : 0,
    }));
    res.json(normalized);
  } catch (error) {
    console.error('Fetch tenants error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 1.5. Register a New Tenant (Admin only)
router.post('/tenants', requireAdmin as any, async (req: any, res: Response) => {
  try {
    const { name, email, password, packageId, status } = req.body;
    const includePackageId = await hasUserPackageColumn();

    if (!name || !email || !password || !packageId) {
      return res.status(400).json({ error: 'ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບຖ້ວນ' });
    }

    // Check if email already exists
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'ອີເມວນີ້ຖືກລົງທະບຽນໃນລະບົບແລ້ວ' });
    }

    // Verify package exists
    const targetPkg = await db.select().from(packages).where(eq(packages.id, packageId)).limit(1);
    if (targetPkg.length === 0) {
      return res.status(400).json({ error: 'ບໍ່ພົບແພັກເກດທີ່ເລືອກ' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const tenantId = crypto.randomUUID();

    // Create user
    await db.insert(users).values({
      id: tenantId,
      name,
      email,
      password: hashedPassword,
      status: status || 'approved',
      role: 'tenant',
      ...(includePackageId ? { packageId } : {}),
    });

    res.status(201).json({ message: 'ລົງທະບຽນລູກຄ້າໃໝ່ສຳເລັດ', tenantId });
  } catch (error) {
    console.error('Create tenant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 1.8. Update Tenant Details (Admin only)
router.put('/tenants/:id', requireAdmin as any, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, password, packageId, status } = req.body;
    const includePackageId = await hasUserPackageColumn();

    // Check if user exists
    const userResult = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (userResult.length === 0) {
      return res.status(404).json({ error: 'ບໍ່ພົບຜູ້ໃຊ້' });
    }

    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) {
      // Check if email duplicate
      const duplicate = await db.select().from(users).where(and(eq(users.email, email), ne(users.id, id))).limit(1);
      if (duplicate.length > 0) {
        return res.status(400).json({ error: 'ອີເມວນີ້ຖືກໃຊ້ໂດຍຜູ້ໃຊ້ອື່ນແລ້ວ' });
      }
      updateData.email = email;
    }
    if (packageId !== undefined) {
      if (!includePackageId) {
        return res.status(400).json({ error: 'Server ນີ້ຍັງບໍ່ຮອງຮັບ package assignment' });
      }
      // Verify package
      const targetPkg = await db.select().from(packages).where(eq(packages.id, packageId)).limit(1);
      if (targetPkg.length === 0) {
        return res.status(400).json({ error: 'ບໍ່ພົບແພັກເກດທີ່ເລືອກ' });
      }
      updateData.packageId = packageId;
    }
    if (status !== undefined) {
      if (!['pending', 'approved', 'suspended'].includes(status)) {
        return res.status(400).json({ error: 'ສະຖານະບໍ່ຖືກຕ້ອງ' });
      }
      updateData.status = status;
    }
    if (password && password.trim().length > 0) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'ບໍ່ມີຂໍ້ມູນທີ່ຈະອັບເດດ' });
    }

    await db.update(users).set(updateData).where(eq(users.id, id));

    res.json({ message: 'ອັບເດດຂໍ້ມູນລູກຄ້າສຳເລັດ' });
  } catch (error) {
    console.error('Update tenant details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 1.9. Fetch Pages for a specific tenant (Admin only)
router.get('/tenants/:userId/pages', requireAdmin as any, async (req: any, res: Response) => {
  try {
    const { userId } = req.params;
    const tenantPages = await db.select().from(pages).where(eq(pages.userId, userId));
    res.json(tenantPages);
  } catch (error) {
    console.error('Fetch tenant pages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 1.95. Connect a new Page for a specific tenant (Admin only)
router.post('/tenants/:userId/pages', requireAdmin as any, async (req: any, res: Response) => {
  try {
    const { userId } = req.params;
    const { fbPageId, fbPageName, fbPageAccessToken, knowledgeBase, aiName, aiConfigId } = req.body;

    if (!fbPageId || !fbPageName || !fbPageAccessToken) {
      return res.status(400).json({ error: 'fbPageId, fbPageName, and fbPageAccessToken are required' });
    }

    // Check if duplicate
    const existing = await db.select().from(pages).where(eq(pages.fbPageId, fbPageId)).limit(1);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'This Facebook Page is already connected.' });
    }

    // Check limits
    const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (userResult.length > 0) {
      const user = userResult[0];
      if (user.role !== 'admin' && user.packageId) {
        const pkgResult = await db.select().from(packages).where(eq(packages.id, user.packageId)).limit(1);
        if (pkgResult.length > 0) {
          const pkg = pkgResult[0];
          const userPages = await db.select().from(pages).where(eq(pages.userId, userId));
          if (userPages.length >= pkg.maxPages) {
            return res.status(400).json({
              error: `ແພັກເກດຂອງລູກຄ້າ (${pkg.name}) ອະນຸຍາດໃຫ້ເຊື່ອມຕໍ່ໄດ້ສູງສຸດ ${pkg.maxPages} ເພຈ໌.`
            });
          }
        }
      }
    }

    const resolvedAiConfigId = await validateActiveAiConfigId(aiConfigId);
    if (!resolvedAiConfigId) {
      return res.status(400).json({ error: 'ບໍ່ພົບ AI ທີ່ active. ກະລຸນາເປີດໃຊ້ AI Config ກ່ອນ.' });
    }

    const newPageId = crypto.randomUUID();
    await db.insert(pages).values({
      id: newPageId,
      userId,
      fbPageId,
      fbPageName,
      fbPageAccessToken,
      knowledgeBase: knowledgeBase || '',
      aiName: aiName || 'ຜູ້ຊ່ວຍ AI',
      aiConfigId: resolvedAiConfigId,
      isActive: true,
    });

    res.status(201).json({ message: 'Page connected successfully', id: newPageId });
  } catch (error) {
    console.error('Connect tenant page error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 1.96. Update tenant page connection (Admin only)
router.put('/tenants/:userId/pages/:pageId', requireAdmin as any, async (req: any, res: Response) => {
  try {
    const { userId, pageId } = req.params;
    const { fbPageId, fbPageName, fbPageAccessToken, knowledgeBase, isActive, aiName, aiConfigId } = req.body;

    const pageResult = await db.select().from(pages).where(and(eq(pages.id, pageId), eq(pages.userId, userId))).limit(1);
    if (pageResult.length === 0) {
      return res.status(404).json({ error: 'ບໍ່ພົບຂໍ້ມູນການເຊື່ອມຕໍ່ເພຈ' });
    }

    const updates: Partial<typeof pages.$inferInsert> = {};
    if (knowledgeBase !== undefined) updates.knowledgeBase = knowledgeBase;
    if (aiName !== undefined) updates.aiName = aiName;
    if (isActive !== undefined) updates.isActive = isActive;
    if (fbPageName !== undefined) updates.fbPageName = fbPageName;
    if (aiConfigId !== undefined) {
      const resolvedAiConfigId = await validateActiveAiConfigId(aiConfigId);
      if (!resolvedAiConfigId) {
        return res.status(400).json({ error: 'ບໍ່ພົບ AI ທີ່ active. ກະລຸນາເປີດໃຊ້ AI Config ກ່ອນ.' });
      }
      updates.aiConfigId = resolvedAiConfigId;
    }
    if (fbPageId !== undefined) {
      if (fbPageId !== pageResult[0].fbPageId) {
        const existing = await db.select().from(pages).where(eq(pages.fbPageId, fbPageId)).limit(1);
        if (existing.length > 0) {
          return res.status(400).json({ error: 'Facebook Page ນີ້ຖືກເຊື່ອມຕໍ່ໄປແລ້ວ.' });
        }
      }
      updates.fbPageId = fbPageId;
    }
    if (fbPageAccessToken !== undefined) updates.fbPageAccessToken = fbPageAccessToken;

    await db.update(pages).set(updates).where(eq(pages.id, pageId));
    res.json({ message: 'Page connection updated successfully' });
  } catch (error) {
    console.error('Update tenant page error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 1.97. Delete tenant page connection (Admin only)
router.delete('/tenants/:userId/pages/:pageId', requireAdmin as any, async (req: any, res: Response) => {
  try {
    const { userId, pageId } = req.params;
    const pageResult = await db.select().from(pages).where(and(eq(pages.id, pageId), eq(pages.userId, userId))).limit(1);
    if (pageResult.length === 0) {
      return res.status(404).json({ error: 'ບໍ່ພົບຂໍ້ມູນການເຊື່ອມຕໍ່ເພຈ' });
    }

    await db.delete(pages).where(eq(pages.id, pageId));
    res.json({ message: 'Page connection deleted successfully' });
  } catch (error) {
    console.error('Delete tenant page error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. Update Tenant Status (approve, suspend, activate)
router.put('/tenants/:id/status', requireAdmin as any, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'approved', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    await db.update(users).set({ status }).where(eq(users.id, id));
    res.json({ message: 'Tenant status updated successfully' });
  } catch (error) {
    console.error('Update tenant status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. Fetch All Subscription Packages (including inactive, for admin)
router.get('/packages', requireAdmin as any, async (req: any, res: Response) => {
  try {
    const allPackages = await db.select().from(packages).orderBy(asc(packages.price));
    res.json(allPackages);
  } catch (error) {
    console.error('Fetch all packages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 4. Create Subscription Package
router.post('/packages', requireAdmin as any, async (req: any, res: Response) => {
  try {
    const { name, maxPages, maxTokens, price } = req.body;

    if (!name || maxPages === undefined || maxTokens === undefined || !price) {
      return res.status(400).json({ error: 'Missing package fields' });
    }

    const packageId = `pkg-${crypto.randomBytes(4).toString('hex')}`;
    await db.insert(packages).values({
      id: packageId,
      name,
      maxPages,
      maxTokens,
      price: price.toString(),
      isActive: true,
    });

    res.status(201).json({ message: 'Subscription package created successfully', packageId });
  } catch (error) {
    console.error('Create package error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 4. Update Subscription Package
router.put('/packages/:id', requireAdmin as any, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { name, maxPages, maxTokens, price, isActive } = req.body;

    // Check package exists
    const existing = await db.select().from(packages).where(eq(packages.id, id)).limit(1);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Package not found' });
    }

    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (maxPages !== undefined) updateData.maxPages = maxPages;
    if (maxTokens !== undefined) updateData.maxTokens = maxTokens;
    if (price !== undefined) updateData.price = price.toString();
    if (isActive !== undefined) updateData.isActive = isActive;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    await db.update(packages).set(updateData).where(eq(packages.id, id));

    res.json({ message: 'Package updated successfully' });
  } catch (error) {
    console.error('Update package error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 4.5. Fetch Token Top-up Bundles
router.get('/token-bundles', requireAdmin as any, async (req: any, res: Response) => {
  try {
    const bundles = await getAllTokenBundles();
    res.json(bundles);
  } catch (error) {
    console.error('Fetch token bundles error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 4.6. Create Token Top-up Bundle
router.post('/token-bundles', requireAdmin as any, async (req: any, res: Response) => {
  try {
    const { name, tokenAmount, price, sortOrder = 0, isActive = true } = req.body;

    if (!name || !tokenAmount || price === undefined) {
      return res.status(400).json({ error: 'Missing token bundle fields' });
    }

    await ensureTokenBundlesReady();
    const bundleId = `tok-${crypto.randomBytes(4).toString('hex')}`;
    await db.insert(tokenBundles).values({
      id: bundleId,
      name,
      tokenAmount: Number(tokenAmount),
      price: price.toString(),
      sortOrder: Number(sortOrder || 0),
      isActive: Boolean(isActive),
    });

    res.status(201).json({ message: 'Token bundle created successfully', bundleId });
  } catch (error) {
    console.error('Create token bundle error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 4.7. Update Token Top-up Bundle
router.put('/token-bundles/:id', requireAdmin as any, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { name, tokenAmount, price, sortOrder, isActive } = req.body;

    await ensureTokenBundlesReady();
    const existing = await db.select().from(tokenBundles).where(eq(tokenBundles.id, id)).limit(1);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Token bundle not found' });
    }

    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (tokenAmount !== undefined) updateData.tokenAmount = Number(tokenAmount);
    if (price !== undefined) updateData.price = price.toString();
    if (sortOrder !== undefined) updateData.sortOrder = Number(sortOrder);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    await db.update(tokenBundles).set(updateData).where(eq(tokenBundles.id, id));
    res.json({ message: 'Token bundle updated successfully' });
  } catch (error) {
    console.error('Update token bundle error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 4.8. Grant bonus tokens directly to a user
router.post('/users/:id/bonus-tokens', requireAdmin as any, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;

    const tokenAmount = Number(amount || 0);
    if (!Number.isFinite(tokenAmount) || tokenAmount <= 0) {
      return res.status(400).json({ error: 'Token amount must be greater than zero' });
    }

    const includeBonusTokens = await hasBonusTokensColumn();
    if (!includeBonusTokens) {
      return res.status(503).json({ error: 'bonus_tokens column is not available yet. Please run migrations on this server.' });
    }

    const userResult = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (userResult.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await db
      .update(users)
      .set({ bonusTokens: sql`${users.bonusTokens} + ${tokenAmount}` })
      .where(eq(users.id, id));

    res.json({ message: 'Bonus tokens added successfully', amount: tokenAmount });
  } catch (error) {
    console.error('Grant bonus tokens error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 4.9. Fetch Pending Payments Count
router.get('/payments/pending-count', requireAdmin as any, async (req: any, res: Response) => {
  try {
    const pendingResult = await db
      .select({ count: count() })
      .from(payments)
      .where(
        and(
          eq(payments.status, 'pending'),
          sql`${payments.slipUrl} IS NOT NULL`,
          ne(payments.slipUrl, '')
        )
      );
    const countVal = Number(pendingResult[0]?.count || 0);
    res.json({ count: countVal });
  } catch (error) {
    console.error('Fetch pending count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 5. Fetch Payments logs
router.get('/payments', requireAdmin as any, async (req: any, res: Response) => {
  try {
    const paymentCols = await getPaymentsColumnFlags();
    const tokenBundles = await getAllTokenBundles();
    const bundleByPrice = new Map<number, any>();
    for (const bundle of tokenBundles) {
      bundleByPrice.set(Number(bundle.price), bundle);
    }
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    const statusQuery = req.query.status as string | undefined;
    const excludeStatusQuery = req.query.excludeStatus as string | undefined;

    const conditions = [];
    if (statusQuery) {
      conditions.push(eq(payments.status, statusQuery));
    }
    if (excludeStatusQuery) {
      conditions.push(ne(payments.status, excludeStatusQuery));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count for pagination
    const countQuery = db.select({ total: count() }).from(payments);
    if (whereClause) {
      countQuery.where(whereClause);
    }
    const totalResult = await countQuery;
    const total = Number(totalResult[0]?.total || 0);

    // Fetch paginated payments, newest first
    const paymentSelect: Record<string, any> = {
      id: payments.id,
      userId: payments.userId,
      packageId: payments.packageId,
      amount: payments.amount,
      status: payments.status,
      createdAt: payments.createdAt,
    };
    if (paymentCols.paymentType) paymentSelect.paymentType = payments.paymentType;
    if (paymentCols.tokenAmount) paymentSelect.tokenAmount = payments.tokenAmount;
    if (paymentCols.recordedBy) paymentSelect.recordedBy = payments.recordedBy;
    if (paymentCols.paymentDate) paymentSelect.paymentDate = payments.paymentDate;
    if (paymentCols.slipUrl) paymentSelect.slipUrl = payments.slipUrl;

    const selectQuery = db.select(paymentSelect).from(payments);
    if (whereClause) {
      selectQuery.where(whereClause);
    }
    const paymentsList = await selectQuery
      .orderBy(desc(payments.createdAt))
      .limit(limit)
      .offset(offset);

    // Enrich with user name & package name
    const enriched = await Promise.all(
      paymentsList.map(async (pay) => {
        const amountNumber = Number(pay.amount);
        const inferredBundle = bundleByPrice.get(amountNumber);
        const inferredPaymentType = paymentCols.paymentType
          ? pay.paymentType
          : inferredBundle
            ? 'token_topup'
            : 'package';
        const inferredTokenAmount = paymentCols.tokenAmount
          ? Number(pay.tokenAmount || 0)
          : inferredBundle
            ? Number(inferredBundle.tokenAmount || 0)
            : 0;
        const user = pay.userId
          ? (await db.select({ name: users.name }).from(users).where(eq(users.id, pay.userId)).limit(1))[0]
          : null;
        const pkg = pay.packageId
          ? (await db.select({ name: packages.name }).from(packages).where(eq(packages.id, pay.packageId)).limit(1))[0]
          : null;
        return {
          ...pay,
          amount: Number(pay.amount),
          paymentType: inferredPaymentType,
          paymentKind: inferredPaymentType,
          tokenAmount: inferredTokenAmount,
          userName: user?.name || 'Unknown',
          packageName: pkg?.name || '—',
          slipUrl: paymentCols.slipUrl ? pay.slipUrl : null,
          paymentDate: paymentCols.paymentDate ? pay.paymentDate : null,
        };
      })
    );

    res.json({
      data: enriched,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Fetch payments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 6. Log New Payment (supports both package and token top-up)
router.post('/payments', requireAdmin as any, async (req: any, res: Response) => {
  try {
    const { userId, amount, paymentType = 'package', tokenAmount = 0 } = req.body;
    const includePackageId = await hasUserPackageColumn();

    if (!userId || !amount) {
      return res.status(400).json({ error: 'Missing payment fields' });
    }

    const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (userResult.length === 0) {
      return res.status(404).json({ error: 'Tenant user not found' });
    }

    const user = userResult[0];

    const paymentId = crypto.randomUUID();
    const paymentValues: any = {
      id: paymentId,
      userId,
      paymentType,
      tokenAmount: Number(tokenAmount || 0),
      amount: amount.toString(),
      status: 'paid',
      recordedBy: req.user?.userId || null,
      paymentDate: new Date(),
    };
    if (includePackageId) {
      paymentValues.packageId = user.packageId || '';
    }
    await db.insert(payments).values(paymentValues);

    // If it's a token top-up, credit user's bonusTokens immediately
    if (paymentType === 'token_topup' && Number(tokenAmount) > 0) {
      await db
        .update(users)
        .set({ bonusTokens: sql`${users.bonusTokens} + ${Number(tokenAmount)}` })
        .where(eq(users.id, userId));
    }

    res.status(201).json({ message: 'Payment recorded successfully', paymentId });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 7. Mark payment as paid (confirm pending → paid)
router.put('/payments/:id/pay', requireAdmin as any, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const includePackageId = await hasUserPackageColumn();
    const includeBonusTokens = await hasBonusTokensColumn();

    const pay = await getPaymentByIdRaw(id);
    if (!pay) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (pay.paymentType === 'token_topup') {
      if (!includeBonusTokens) {
        return res.status(503).json({ error: 'bonus_tokens column is not available yet. Please run migrations on this server.' });
      }
    } else if (!includePackageId) {
      return res.status(400).json({ error: 'Server ນີ້ຍັງບໍ່ຮອງຮັບ package assignment' });
    }

    const adminId = req.user?.userId || null;

    // Update payment record
    await updatePaymentStatusRaw(id, 'paid', adminId);

    if (pay.paymentType === 'token_topup') {
      await db
        .update(users)
        .set({ bonusTokens: sql`${users.bonusTokens} + ${Number(pay.tokenAmount || 0)}` })
        .where(eq(users.id, pay.userId));
    } else {
      // Upgrade the user's package
      await db
        .update(users)
        .set({ packageId: pay.packageId })
        .where(eq(users.id, pay.userId));
    }

    res.json({ message: 'Payment confirmed successfully' });
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json(adminPaymentErrorResponse('Confirm payment', error));
  }
});

// 8. Reject payment
router.put('/payments/:id/reject', requireAdmin as any, async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await getPaymentByIdRaw(id);
    if (!existing) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const adminId = req.user?.userId || null;

    await updatePaymentStatusRaw(id, 'rejected', adminId);

    res.json({ message: 'Payment rejected successfully' });
  } catch (error) {
    console.error('Reject payment error:', error);
    res.status(500).json(adminPaymentErrorResponse('Reject payment', error));
  }
});

// 9. Fetch all SaaS Bank Accounts
router.get('/bank-accounts', requireAdmin as any, async (req: any, res: Response) => {
  try {
    const list = await db.select().from(bankAccounts).orderBy(desc(bankAccounts.createdAt));
    res.json(list);
  } catch (error) {
    console.error('Fetch bank accounts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 10. Create a Bank Account
router.post('/bank-accounts', requireAdmin as any, async (req: any, res: Response) => {
  try {
    const { bankName, accountName, accountNumber, qrCodeBase64, qrCodeName, isActive } = req.body;

    if (!bankName || !accountName || !accountNumber) {
      return res.status(400).json({ error: 'ກະລຸນາປ້ອນຂໍ້ມູນບັນຊີທະນາຄານໃຫ້ຄົບຖ້ວນ' });
    }

    let qrCodeUrl = '';
    if (qrCodeBase64 && qrCodeName) {
      try {
        const base64Data = qrCodeBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const uniqueFileName = `${crypto.randomUUID()}-${qrCodeName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        
        const uploadDir = ensureUploadsDir('banks');

        const filePath = path.join(uploadDir, uniqueFileName);
        fs.writeFileSync(filePath, buffer);
        
        qrCodeUrl = toPublicUploadPath('banks', uniqueFileName);
      } catch (uploadError) {
        console.error('QR code upload write error:', uploadError);
        return res.status(500).json({ error: 'ເກີດຂໍ້ຜິດພາດໃນການບັນທຶກຮູບພາບ QR Code' });
      }
    }

    const accountId = crypto.randomUUID();
    await db.insert(bankAccounts).values({
      id: accountId,
      bankName,
      accountName,
      accountNumber,
      qrCodeUrl,
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json({ message: 'ເພີ່ມບັນຊີທະນາຄານສຳເລັດ', id: accountId });
  } catch (error) {
    console.error('Create bank account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 11. Update a Bank Account
router.put('/bank-accounts/:id', requireAdmin as any, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { bankName, accountName, accountNumber, qrCodeBase64, qrCodeName, isActive } = req.body;

    const existing = await db.select().from(bankAccounts).where(eq(bankAccounts.id, id)).limit(1);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'ບໍ່ພົບຂໍ້ມູນບັນຊີທະນາຄານ' });
    }

    const updates: Partial<typeof bankAccounts.$inferInsert> = {};
    if (bankName !== undefined) updates.bankName = bankName;
    if (accountName !== undefined) updates.accountName = accountName;
    if (accountNumber !== undefined) updates.accountNumber = accountNumber;
    if (isActive !== undefined) updates.isActive = isActive;

    if (qrCodeBase64 && qrCodeName) {
      try {
        const base64Data = qrCodeBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const uniqueFileName = `${crypto.randomUUID()}-${qrCodeName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        
        const uploadDir = ensureUploadsDir('banks');

        const filePath = path.join(uploadDir, uniqueFileName);
        fs.writeFileSync(filePath, buffer);
        
        updates.qrCodeUrl = toPublicUploadPath('banks', uniqueFileName);
      } catch (uploadError) {
        console.error('QR code upload write error:', uploadError);
        return res.status(500).json({ error: 'ເກີດຂໍ້ຜິດພາດໃນການບັນທຶກຮູບພາບ QR Code' });
      }
    }

    await db.update(bankAccounts).set(updates).where(eq(bankAccounts.id, id));

    res.json({ message: 'ອັບເດດຂໍ້ມູນບັນຊີທະນາຄານສຳເລັດ' });
  } catch (error) {
    console.error('Update bank account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 12. Delete a Bank Account
router.delete('/bank-accounts/:id', requireAdmin as any, async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await db.select().from(bankAccounts).where(eq(bankAccounts.id, id)).limit(1);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'ບໍ່ພົບຂໍ້ມູນບັນຊີທະນາຄານ' });
    }

    await db.delete(bankAccounts).where(eq(bankAccounts.id, id));

    res.json({ message: 'ລຶບບັນຊີທະນາຄານສຳເລັດ' });
  } catch (error) {
    console.error('Delete bank account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
