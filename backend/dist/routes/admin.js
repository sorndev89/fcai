"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../config/db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'fb-chatbot-super-secret-key-12345';
// Admin Authorization Middleware
function requireAdmin(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    jsonwebtoken_1.default.verify(token, JWT_SECRET, (err, decoded) => {
        if (err || !decoded || decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied: Admin role required' });
        }
        req.user = decoded;
        next();
    });
}
// 1. Fetch Tenants list (excludes the admin user itself)
router.get('/tenants', requireAdmin, async (req, res) => {
    try {
        const tenants = await db_1.db
            .select({
            id: schema_1.users.id,
            name: schema_1.users.name,
            email: schema_1.users.email,
            role: schema_1.users.role,
            status: schema_1.users.status,
            packageId: schema_1.users.packageId,
            createdAt: schema_1.users.createdAt,
        })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.ne)(schema_1.users.role, 'admin'));
        res.json(tenants);
    }
    catch (error) {
        console.error('Fetch tenants error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// 2. Update Tenant Status (approve, suspend, activate)
router.put('/tenants/:id/status', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!['pending', 'approved', 'suspended'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status value' });
        }
        await db_1.db.update(schema_1.users).set({ status }).where((0, drizzle_orm_1.eq)(schema_1.users.id, id));
        res.json({ message: 'Tenant status updated successfully' });
    }
    catch (error) {
        console.error('Update tenant status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// 3. Fetch All Subscription Packages (including inactive, for admin)
router.get('/packages', requireAdmin, async (req, res) => {
    try {
        const allPackages = await db_1.db.select().from(schema_1.packages).orderBy((0, drizzle_orm_1.asc)(schema_1.packages.price));
        res.json(allPackages);
    }
    catch (error) {
        console.error('Fetch all packages error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// 4. Create Subscription Package
router.post('/packages', requireAdmin, async (req, res) => {
    try {
        const { name, maxPages, maxTokens, price } = req.body;
        if (!name || maxPages === undefined || maxTokens === undefined || !price) {
            return res.status(400).json({ error: 'Missing package fields' });
        }
        const packageId = `pkg-${crypto_1.default.randomBytes(4).toString('hex')}`;
        await db_1.db.insert(schema_1.packages).values({
            id: packageId,
            name,
            maxPages,
            maxTokens,
            price: price.toString(),
            isActive: true,
        });
        res.status(201).json({ message: 'Subscription package created successfully', packageId });
    }
    catch (error) {
        console.error('Create package error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// 4. Update Subscription Package
router.put('/packages/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, maxPages, maxTokens, price, isActive } = req.body;
        // Check package exists
        const existing = await db_1.db.select().from(schema_1.packages).where((0, drizzle_orm_1.eq)(schema_1.packages.id, id)).limit(1);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Package not found' });
        }
        const updateData = {};
        if (name !== undefined)
            updateData.name = name;
        if (maxPages !== undefined)
            updateData.maxPages = maxPages;
        if (maxTokens !== undefined)
            updateData.maxTokens = maxTokens;
        if (price !== undefined)
            updateData.price = price.toString();
        if (isActive !== undefined)
            updateData.isActive = isActive;
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }
        await db_1.db.update(schema_1.packages).set(updateData).where((0, drizzle_orm_1.eq)(schema_1.packages.id, id));
        res.json({ message: 'Package updated successfully' });
    }
    catch (error) {
        console.error('Update package error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// 5. Fetch Payments logs
router.get('/payments', requireAdmin, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
        const offset = (page - 1) * limit;
        // Get total count for pagination
        const totalResult = await db_1.db.select({ total: (0, drizzle_orm_1.count)() }).from(schema_1.payments);
        const total = Number(totalResult[0]?.total || 0);
        // Fetch paginated payments, newest first
        const paymentsList = await db_1.db
            .select()
            .from(schema_1.payments)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.payments.createdAt))
            .limit(limit)
            .offset(offset);
        // Enrich with user name & package name
        const enriched = await Promise.all(paymentsList.map(async (pay) => {
            const user = pay.userId
                ? (await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, pay.userId)).limit(1))[0]
                : null;
            const pkg = pay.packageId
                ? (await db_1.db.select().from(schema_1.packages).where((0, drizzle_orm_1.eq)(schema_1.packages.id, pay.packageId)).limit(1))[0]
                : null;
            return {
                ...pay,
                amount: Number(pay.amount),
                userName: user?.name || 'Unknown',
                packageName: pkg?.name || '—',
            };
        }));
        res.json({
            data: enriched,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    }
    catch (error) {
        console.error('Fetch payments error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// 6. Log New Payment
router.post('/payments', requireAdmin, async (req, res) => {
    try {
        const { userId, amount } = req.body;
        if (!userId || !amount) {
            return res.status(400).json({ error: 'Missing payment fields' });
        }
        const userResult = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId)).limit(1);
        if (userResult.length === 0) {
            return res.status(404).json({ error: 'Tenant user not found' });
        }
        const user = userResult[0];
        const paymentId = crypto_1.default.randomUUID();
        await db_1.db.insert(schema_1.payments).values({
            id: paymentId,
            userId,
            packageId: user.packageId || '',
            amount: amount.toString(),
            status: 'paid',
            recordedBy: req.user?.userId || null,
            paymentDate: new Date(),
        });
        res.status(201).json({ message: 'Payment recorded successfully', paymentId });
    }
    catch (error) {
        console.error('Record payment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// 7. Mark payment as paid (confirm pending → paid)
router.put('/payments/:id/pay', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await db_1.db.select().from(schema_1.payments).where((0, drizzle_orm_1.eq)(schema_1.payments.id, id)).limit(1);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        await db_1.db
            .update(schema_1.payments)
            .set({
            status: 'paid',
            paymentDate: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.payments.id, id));
        res.json({ message: 'Payment confirmed successfully' });
    }
    catch (error) {
        console.error('Confirm payment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map