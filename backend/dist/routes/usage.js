"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../config/db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Apply auth middleware to all routes
router.use(auth_1.authenticateToken);
/**
 * GET /api/usage/my
 * Returns aggregated token usage for the currently authenticated user
 * across all their Facebook pages.
 */
router.get('/my', async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        // Get all page IDs owned by this user
        const userPages = await db_1.db.select({ id: schema_1.pages.id }).from(schema_1.pages).where((0, drizzle_orm_1.eq)(schema_1.pages.userId, userId));
        const pageIds = userPages.map(p => p.id);
        if (pageIds.length === 0) {
            return res.json({
                totalTokens: 0,
                totalConversations: 0,
                pagesCount: 0,
                usageByPage: [],
            });
        }
        // Aggregate token usage per page for this user's pages
        const usageByPage = await db_1.db
            .select({
            pageId: schema_1.chatLogs.pageId,
            pageName: schema_1.pages.fbPageName,
            totalTokens: (0, drizzle_orm_1.sql) `COALESCE(SUM(${schema_1.chatLogs.tokenCount}), 0)`,
            totalConversations: (0, drizzle_orm_1.sql) `COUNT(*)`,
        })
            .from(schema_1.chatLogs)
            .innerJoin(schema_1.pages, (0, drizzle_orm_1.eq)(schema_1.chatLogs.pageId, schema_1.pages.id))
            .where((0, drizzle_orm_1.inArray)(schema_1.chatLogs.pageId, pageIds))
            .groupBy(schema_1.chatLogs.pageId, schema_1.pages.fbPageName);
        // Calculate grand totals
        const grandTotal = await db_1.db
            .select({
            totalTokens: (0, drizzle_orm_1.sql) `COALESCE(SUM(${schema_1.chatLogs.tokenCount}), 0)`,
            totalConversations: (0, drizzle_orm_1.sql) `COUNT(*)`,
        })
            .from(schema_1.chatLogs)
            .where((0, drizzle_orm_1.inArray)(schema_1.chatLogs.pageId, pageIds));
        const totals = grandTotal[0] || { totalTokens: 0, totalConversations: 0 };
        res.json({
            totalTokens: totals.totalTokens,
            totalConversations: totals.totalConversations,
            pagesCount: pageIds.length,
            usageByPage,
        });
    }
    catch (error) {
        console.error('[Usage API] Error fetching user token usage:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * GET /api/usage/all
 * Admin only: Returns aggregated token usage for ALL users
 * with breakdown per user.
 */
router.get('/all', async (req, res) => {
    try {
        const userRole = req.user?.role;
        if (userRole !== 'admin') {
            return res.status(403).json({ error: 'Forbidden: Admin access required' });
        }
        // Aggregate token usage per user
        const usageByUser = await db_1.db
            .select({
            userId: schema_1.pages.userId,
            userName: schema_1.users.name,
            userEmail: schema_1.users.email,
            totalTokens: (0, drizzle_orm_1.sql) `COALESCE(SUM(${schema_1.chatLogs.tokenCount}), 0)`,
            totalConversations: (0, drizzle_orm_1.sql) `COUNT(*)`,
            pagesCount: (0, drizzle_orm_1.sql) `COUNT(DISTINCT ${schema_1.chatLogs.pageId})`,
        })
            .from(schema_1.chatLogs)
            .innerJoin(schema_1.pages, (0, drizzle_orm_1.eq)(schema_1.chatLogs.pageId, schema_1.pages.id))
            .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.pages.userId, schema_1.users.id))
            .groupBy(schema_1.pages.userId, schema_1.users.name, schema_1.users.email)
            .orderBy((0, drizzle_orm_1.sql) `COALESCE(SUM(${schema_1.chatLogs.tokenCount}), 0)`);
        // Grand total across all users
        const grandTotal = await db_1.db
            .select({
            totalTokens: (0, drizzle_orm_1.sql) `COALESCE(SUM(${schema_1.chatLogs.tokenCount}), 0)`,
            totalConversations: (0, drizzle_orm_1.sql) `COUNT(*)`,
        })
            .from(schema_1.chatLogs);
        const totals = grandTotal[0] || { totalTokens: 0, totalConversations: 0 };
        res.json({
            totalTokens: totals.totalTokens,
            totalConversations: totals.totalConversations,
            totalUsers: usageByUser.length,
            usageByUser,
        });
    }
    catch (error) {
        console.error('[Usage API] Error fetching all token usage:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=usage.js.map