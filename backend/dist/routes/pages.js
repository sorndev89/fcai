"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../config/db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("../middleware/auth");
const crypto_1 = __importDefault(require("crypto"));
const router = (0, express_1.Router)();
// Apply authentication middleware to all sub-routes
router.use(auth_1.authenticateToken);
// Get all connected pages
router.get('/', async (req, res) => {
    try {
        const userId = req.user.userId;
        const connectedPages = await db_1.db.select().from(schema_1.pages).where((0, drizzle_orm_1.eq)(schema_1.pages.userId, userId));
        res.json(connectedPages);
    }
    catch (error) {
        console.error('Get pages error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Connect a new Facebook Page
router.post('/', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { fbPageId, fbPageName, fbPageAccessToken, knowledgeBase } = req.body;
        if (!fbPageId || !fbPageName || !fbPageAccessToken) {
            return res.status(400).json({ error: 'fbPageId, fbPageName, and fbPageAccessToken are required' });
        }
        // Check if the page is already registered
        const existing = await db_1.db.select().from(schema_1.pages).where((0, drizzle_orm_1.eq)(schema_1.pages.fbPageId, fbPageId)).limit(1);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'This Facebook Page is already connected.' });
        }
        const newPageId = crypto_1.default.randomUUID();
        await db_1.db.insert(schema_1.pages).values({
            id: newPageId,
            userId,
            fbPageId,
            fbPageName,
            fbPageAccessToken,
            knowledgeBase: knowledgeBase || '',
            isActive: true,
        });
        res.status(201).json({
            message: 'Page connected successfully',
            page: {
                id: newPageId,
                fbPageId,
                fbPageName,
                isActive: true,
            },
        });
    }
    catch (error) {
        console.error('Connect page error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update page details (knowledgeBase, isActive status)
router.put('/:id', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const { knowledgeBase, isActive } = req.body;
        // Verify page ownership
        const page = await db_1.db.select().from(schema_1.pages).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.pages.id, id), (0, drizzle_orm_1.eq)(schema_1.pages.userId, userId))).limit(1);
        if (page.length === 0) {
            return res.status(404).json({ error: 'Page connection not found or unauthorized' });
        }
        const updates = {};
        if (knowledgeBase !== undefined)
            updates.knowledgeBase = knowledgeBase;
        if (isActive !== undefined)
            updates.isActive = isActive;
        await db_1.db.update(schema_1.pages).set(updates).where((0, drizzle_orm_1.eq)(schema_1.pages.id, id));
        res.json({ message: 'Page connection updated successfully' });
    }
    catch (error) {
        console.error('Update page error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Delete a page connection
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        // Verify page ownership
        const page = await db_1.db.select().from(schema_1.pages).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.pages.id, id), (0, drizzle_orm_1.eq)(schema_1.pages.userId, userId))).limit(1);
        if (page.length === 0) {
            return res.status(404).json({ error: 'Page connection not found or unauthorized' });
        }
        await db_1.db.delete(schema_1.pages).where((0, drizzle_orm_1.eq)(schema_1.pages.id, id));
        res.json({ message: 'Page connection removed successfully' });
    }
    catch (error) {
        console.error('Delete page error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=pages.js.map