"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../config/db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("../middleware/auth");
const gemini_1 = require("../services/gemini");
const router = (0, express_1.Router)();
// Apply auth middleware to all routes
router.use(auth_1.authenticateToken);
// Helper to verify user owns the page
async function verifyPageOwnership(pageId, userId) {
    const result = await db_1.db.select().from(schema_1.pages).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.pages.id, pageId), (0, drizzle_orm_1.eq)(schema_1.pages.userId, userId))).limit(1);
    return result.length > 0;
}
// Get all customers for a connected page
router.get('/page/:pageId', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { pageId } = req.params;
        const ownsPage = await verifyPageOwnership(pageId, userId);
        if (!ownsPage) {
            return res.status(403).json({ error: 'Unauthorized access to this page' });
        }
        const pageCustomers = await db_1.db.select().from(schema_1.customers).where((0, drizzle_orm_1.eq)(schema_1.customers.pageId, pageId));
        res.json(pageCustomers);
    }
    catch (error) {
        console.error('Get customers error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get customer details by ID
router.get('/:id', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        // Fetch customer details
        const customerResult = await db_1.db.select().from(schema_1.customers).where((0, drizzle_orm_1.eq)(schema_1.customers.id, id)).limit(1);
        if (customerResult.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        const customer = customerResult[0];
        // Verify user owns the page this customer belongs to
        const ownsPage = await verifyPageOwnership(customer.pageId, userId);
        if (!ownsPage) {
            return res.status(403).json({ error: 'Unauthorized access to this customer data' });
        }
        res.json(customer);
    }
    catch (error) {
        console.error('Get customer by id error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update customer details (phone, email, address, notes)
router.put('/:id', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const { phoneNumber, email, address, notes } = req.body;
        // Fetch customer to check existence and ownership
        const customerResult = await db_1.db.select().from(schema_1.customers).where((0, drizzle_orm_1.eq)(schema_1.customers.id, id)).limit(1);
        if (customerResult.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        const customer = customerResult[0];
        const ownsPage = await verifyPageOwnership(customer.pageId, userId);
        if (!ownsPage) {
            return res.status(403).json({ error: 'Unauthorized access to update this customer' });
        }
        const updates = {};
        if (phoneNumber !== undefined)
            updates.phoneNumber = phoneNumber;
        if (email !== undefined)
            updates.email = email;
        if (address !== undefined)
            updates.address = address;
        if (notes !== undefined)
            updates.notes = notes;
        await db_1.db.update(schema_1.customers).set(updates).where((0, drizzle_orm_1.eq)(schema_1.customers.id, id));
        res.json({ message: 'Customer updated successfully' });
    }
    catch (error) {
        console.error('Update customer error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get chat logs history for a customer
router.get('/:id/chats', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        // Fetch customer to verify ownership
        const customerResult = await db_1.db.select().from(schema_1.customers).where((0, drizzle_orm_1.eq)(schema_1.customers.id, id)).limit(1);
        if (customerResult.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        const customer = customerResult[0];
        const ownsPage = await verifyPageOwnership(customer.pageId, userId);
        if (!ownsPage) {
            return res.status(403).json({ error: 'Unauthorized access to these chat logs' });
        }
        // Get logs in ascending order (oldest first, chronological)
        const logs = await db_1.db.select().from(schema_1.chatLogs).where((0, drizzle_orm_1.eq)(schema_1.chatLogs.customerId, id)).orderBy((0, drizzle_orm_1.asc)(schema_1.chatLogs.createdAt));
        res.json(logs);
    }
    catch (error) {
        console.error('Get customer chats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /api/customers/:id/order-summary
router.post('/:id/order-summary', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        // Fetch customer to verify ownership
        const customerResult = await db_1.db.select().from(schema_1.customers).where((0, drizzle_orm_1.eq)(schema_1.customers.id, id)).limit(1);
        if (customerResult.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        const customer = customerResult[0];
        const ownsPage = await verifyPageOwnership(customer.pageId, userId);
        if (!ownsPage) {
            return res.status(403).json({ error: 'Unauthorized access' });
        }
        // Retrieve recent chronological chat logs
        const logs = await db_1.db.select().from(schema_1.chatLogs).where((0, drizzle_orm_1.eq)(schema_1.chatLogs.customerId, id)).orderBy((0, drizzle_orm_1.asc)(schema_1.chatLogs.createdAt));
        // Format logs for AI prompt context
        const chatLogsText = logs.map(l => `Customer: ${l.messageIn}\nAI: ${l.messageOut}`).join('\n');
        // Run AI structured extraction
        const result = await (0, gemini_1.extractOrderSummary)(chatLogsText);
        res.json(result);
    }
    catch (error) {
        console.error('Extract order summary error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=customers.js.map