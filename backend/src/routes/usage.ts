import { Router } from 'express';
import { db } from '../config/db';
import { chatLogs, pages, users } from '../db/schema';
import { eq, inArray, sql } from 'drizzle-orm';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticateToken as any);

/**
 * GET /api/usage/my
 * Returns aggregated token usage for the currently authenticated user
 * across all their Facebook pages.
 */
router.get('/my', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get all page IDs owned by this user
    const userPages = await db.select({ id: pages.id }).from(pages).where(eq(pages.userId, userId));
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
    const usageByPage = await db
      .select({
        pageId: chatLogs.pageId,
        pageName: pages.fbPageName,
        totalTokens: sql<number>`COALESCE(SUM(${chatLogs.tokenCount}), 0)`,
        totalConversations: sql<number>`COUNT(*)`,
      })
      .from(chatLogs)
      .innerJoin(pages, eq(chatLogs.pageId, pages.id))
      .where(inArray(chatLogs.pageId, pageIds))
      .groupBy(chatLogs.pageId, pages.fbPageName);

    // Calculate grand totals
    const grandTotal = await db
      .select({
        totalTokens: sql<number>`COALESCE(SUM(${chatLogs.tokenCount}), 0)`,
        totalConversations: sql<number>`COUNT(*)`,
      })
      .from(chatLogs)
      .where(inArray(chatLogs.pageId, pageIds));

    const totals = grandTotal[0] || { totalTokens: 0, totalConversations: 0 };

    res.json({
      totalTokens: totals.totalTokens,
      totalConversations: totals.totalConversations,
      pagesCount: pageIds.length,
      usageByPage,
    });
  } catch (error) {
    console.error('[Usage API] Error fetching user token usage:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/usage/all
 * Admin only: Returns aggregated token usage for ALL users
 * with breakdown per user.
 */
router.get('/all', async (req: AuthenticatedRequest, res) => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    // Aggregate token usage per user
    const usageByUser = await db
      .select({
        userId: pages.userId,
        userName: users.name,
        userEmail: users.email,
        totalTokens: sql<number>`COALESCE(SUM(${chatLogs.tokenCount}), 0)`,
        totalConversations: sql<number>`COUNT(*)`,
        pagesCount: sql<number>`COUNT(DISTINCT ${chatLogs.pageId})`,
      })
      .from(chatLogs)
      .innerJoin(pages, eq(chatLogs.pageId, pages.id))
      .innerJoin(users, eq(pages.userId, users.id))
      .groupBy(pages.userId, users.name, users.email)
      .orderBy(sql`COALESCE(SUM(${chatLogs.tokenCount}), 0)`);

    // Grand total across all users
    const grandTotal = await db
      .select({
        totalTokens: sql<number>`COALESCE(SUM(${chatLogs.tokenCount}), 0)`,
        totalConversations: sql<number>`COUNT(*)`,
      })
      .from(chatLogs);

    const totals = grandTotal[0] || { totalTokens: 0, totalConversations: 0 };

    res.json({
      totalTokens: totals.totalTokens,
      totalConversations: totals.totalConversations,
      totalUsers: usageByUser.length,
      usageByUser,
    });
  } catch (error) {
    console.error('[Usage API] Error fetching all token usage:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
