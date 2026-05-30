import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../config/db';
import { users, packages, payments } from '../db/schema';
import { eq, ne, asc, count, desc, sql } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fb-chatbot-super-secret-key-12345';

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

// 1. Fetch Tenants list (excludes the admin user itself)
router.get('/tenants', requireAdmin as any, async (req: any, res: Response) => {
  try {
    const tenants = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        packageId: users.packageId,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(ne(users.role, 'admin'));
    res.json(tenants);
  } catch (error) {
    console.error('Fetch tenants error:', error);
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

// 5. Fetch Payments logs
router.get('/payments', requireAdmin as any, async (req: any, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    // Get total count for pagination
    const totalResult = await db.select({ total: count() }).from(payments);
    const total = Number(totalResult[0]?.total || 0);

    // Fetch paginated payments, newest first
    const paymentsList = await db
      .select()
      .from(payments)
      .orderBy(desc(payments.createdAt))
      .limit(limit)
      .offset(offset);

    // Enrich with user name & package name
    const enriched = await Promise.all(
      paymentsList.map(async (pay) => {
        const user = pay.userId
          ? (await db.select().from(users).where(eq(users.id, pay.userId)).limit(1))[0]
          : null;
        const pkg = pay.packageId
          ? (await db.select().from(packages).where(eq(packages.id, pay.packageId)).limit(1))[0]
          : null;
        return {
          ...pay,
          amount: Number(pay.amount),
          userName: user?.name || 'Unknown',
          packageName: pkg?.name || '—',
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

// 6. Log New Payment
router.post('/payments', requireAdmin as any, async (req: any, res: Response) => {
  try {
    const { userId, amount } = req.body;

    if (!userId || !amount) {
      return res.status(400).json({ error: 'Missing payment fields' });
    }

    const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (userResult.length === 0) {
      return res.status(404).json({ error: 'Tenant user not found' });
    }

    const user = userResult[0];

    const paymentId = crypto.randomUUID();
    await db.insert(payments).values({
      id: paymentId,
      userId,
      packageId: user.packageId || '',
      amount: amount.toString(),
      status: 'paid',
      recordedBy: req.user?.userId || null,
      paymentDate: new Date(),
    });

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

    const existing = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    await db
      .update(payments)
      .set({
        status: 'paid',
        paymentDate: new Date(),
      })
      .where(eq(payments.id, id));

    res.json({ message: 'Payment confirmed successfully' });
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
