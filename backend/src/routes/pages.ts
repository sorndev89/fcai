import { Router } from 'express';
import { db } from '../config/db';
import { pages } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import crypto from 'crypto';

const router = Router();

// Apply authentication middleware to all sub-routes
router.use(authenticateToken as any);

// Get all connected pages
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const connectedPages = await db.select().from(pages).where(eq(pages.userId, userId));
    res.json(connectedPages);
  } catch (error) {
    console.error('Get pages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Connect a new Facebook Page
router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { fbPageId, fbPageName, fbPageAccessToken, knowledgeBase } = req.body;

    if (!fbPageId || !fbPageName || !fbPageAccessToken) {
      return res.status(400).json({ error: 'fbPageId, fbPageName, and fbPageAccessToken are required' });
    }

    // Check if the page is already registered
    const existing = await db.select().from(pages).where(eq(pages.fbPageId, fbPageId)).limit(1);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'This Facebook Page is already connected.' });
    }

    const newPageId = crypto.randomUUID();

    await db.insert(pages).values({
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
  } catch (error) {
    console.error('Connect page error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update page details (knowledgeBase, isActive status)
router.put('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { knowledgeBase, isActive } = req.body;

    // Verify page ownership
    const page = await db.select().from(pages).where(and(eq(pages.id, id), eq(pages.userId, userId))).limit(1);
    if (page.length === 0) {
      return res.status(404).json({ error: 'Page connection not found or unauthorized' });
    }

    const updates: Partial<typeof pages.$inferInsert> = {};
    if (knowledgeBase !== undefined) updates.knowledgeBase = knowledgeBase;
    if (isActive !== undefined) updates.isActive = isActive;

    await db.update(pages).set(updates).where(eq(pages.id, id));

    res.json({ message: 'Page connection updated successfully' });
  } catch (error) {
    console.error('Update page error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a page connection
router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    // Verify page ownership
    const page = await db.select().from(pages).where(and(eq(pages.id, id), eq(pages.userId, userId))).limit(1);
    if (page.length === 0) {
      return res.status(404).json({ error: 'Page connection not found or unauthorized' });
    }

    await db.delete(pages).where(eq(pages.id, id));

    res.json({ message: 'Page connection removed successfully' });
  } catch (error) {
    console.error('Delete page error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
