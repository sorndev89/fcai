import { Router } from 'express';
import { db, poolConnection } from '../config/db';
import { users, packages } from '../db/schema';
import { eq, asc } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

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

function userSelect(includeBonusTokens: boolean, includePackageId: boolean) {
  return {
    id: users.id,
    email: users.email,
    password: users.password,
    name: users.name,
    role: users.role,
    status: users.status,
    ...(includePackageId ? { packageId: users.packageId } : {}),
    ...(includeBonusTokens ? { bonusTokens: users.bonusTokens } : {}),
  } as const;
}

// Public endpoint to retrieve active subscription packages for registration form
router.get('/packages', async (req, res) => {
  try {
    const list = await db
      .select()
      .from(packages)
      .where(eq(packages.isActive, true))
      .orderBy(asc(packages.price));
    res.json(list);
  } catch (error) {
    console.error('Fetch packages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register User (with Package Selection)
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, packageId } = req.body;
    const includePackageId = await hasUserPackageColumn();

    if (!email || !password || !name || !packageId) {
      return res.status(400).json({ error: 'ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບຖ້ວນ ລວມທັງເລືອກແພັກເກດ' });
    }

    // Check if email already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'ອີເມວນີ້ຖືກລົງທະບຽນໃນລະບົບແລ້ວ' });
    }

    // Verify selected package exists
    const targetPkg = await db.select().from(packages).where(eq(packages.id, packageId)).limit(1);
    if (targetPkg.length === 0) {
      return res.status(400).json({ error: 'ບໍ່ພົບແພັກເກດທີ່ເລືອກໃນລະບົບ' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();

    // Insert user with role 'tenant' and status 'pending' (pending SaaS Owner approval)
    await db.insert(users).values({
      id: userId,
      email,
      password: hashedPassword,
      name,
      role: 'tenant',
      status: 'pending',
      ...(includePackageId ? { packageId } : {}),
    });

    res.status(201).json({
      message: 'ລົງທະບຽນສຳເລັດ! ກະລຸນາລໍຖ້າການອານຸມັດບັນຊີຈາກຜູ້ດູແລລະບົບ (SaaS Admin)',
      user: { id: userId, email, name, role: 'tenant', status: 'pending', bonusTokens: 0 },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login User
router.post('/login', async (req, res) => {
  try {
    const { email, password, remember } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'ກະລຸນາປ້ອນອີເມວ ແລະ ລະຫັດຜ່ານ' });
    }

    // Fetch user
    const includeBonusTokens = await hasBonusTokensColumn();
    const includePackageId = await hasUserPackageColumn();
    const userResult = await db
      .select(userSelect(includeBonusTokens, includePackageId))
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (userResult.length === 0) {
      return res.status(401).json({ error: 'ອີເມວ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ' });
    }

    const user = userResult[0];

    // Check password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'ອີເມວ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ' });
    }

    // Check account status for tenants
    if (user.role !== 'admin') {
      if (user.status === 'pending') {
        return res.status(403).json({ error: 'ບັນຊີຂອງທ່ານກຳລັງລໍຖ້າການອານຸມັດຈາກ SaaS Owner' });
      }
      if (user.status === 'suspended') {
        return res.status(403).json({ error: 'ບັນຊີຂອງທ່ານຖືກລະງັບການໃຊ້ງານຊົ່ວຄາວ' });
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: remember ? '30d' : '5d' }
    );

    res.json({
      message: 'ເຂົ້າສູ່ລະບົບສຳເລັດ',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        ...(includePackageId ? { packageId: user.packageId } : {}),
        bonusTokens: includeBonusTokens ? Number((user as any).bonusTokens || 0) : 0,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user profile (authenticated)
router.get('/me', authenticateToken as any, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'ບໍ່ມີສິດເຂົ້າເຖິງ' });
    }

    const includeBonusTokens = await hasBonusTokensColumn();
    const includePackageId = await hasUserPackageColumn();
    const userResult = await db
      .select(userSelect(includeBonusTokens, includePackageId))
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (userResult.length === 0) {
      return res.status(404).json({ error: 'ບໍ່ພົບຜູ້ໃຊ້' });
    }

    const user = userResult[0];
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      ...(includePackageId ? { packageId: user.packageId } : {}),
      bonusTokens: includeBonusTokens ? Number((user as any).bonusTokens || 0) : 0,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upgrade / change package (tenant)
router.put('/upgrade', authenticateToken as any, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    const { packageId } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'ບໍ່ມີສິດເຂົ້າເຖິງ' });
    }

    if (!packageId) {
      return res.status(400).json({ error: 'ກະລຸນາເລືອກແພັກເກດ' });
    }

    // Verify package exists and is active
    const targetPkg = await db.select().from(packages).where(eq(packages.id, packageId)).limit(1);
    if (targetPkg.length === 0) {
      return res.status(400).json({ error: 'ບໍ່ພົບແພັກເກດທີ່ເລືອກ' });
    }
    if (!targetPkg[0].isActive) {
      return res.status(400).json({ error: 'ແພັກເກດນີ້ບໍ່ສາມາດໃຊ້ງານໄດ້' });
    }

    // Update user's package
    await db.update(users).set({ packageId }).where(eq(users.id, userId));

    res.json({ message: 'ອັບເກຣດແພັກເກດສຳເລັດ', packageId });
  } catch (error) {
    console.error('Upgrade package error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
