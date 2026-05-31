import { Router } from 'express';
import { db } from '../config/db';
import { pages, users, packages, aiConfig } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { testFacebookPageConnection } from '../services/facebook';
import crypto from 'crypto';


const router = Router();

async function resolveActiveAiConfigId() {
  const configs = await db.select({ id: aiConfig.id }).from(aiConfig).where(eq(aiConfig.isActive, true)).limit(1);
  return configs[0]?.id || null;
}

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

// Get a single connected page detail
router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const pageResult = await db.select().from(pages).where(and(eq(pages.id, id), eq(pages.userId, userId))).limit(1);

    if (pageResult.length === 0) {
      return res.status(404).json({ error: 'Page connection not found or unauthorized' });
    }

    res.json(pageResult[0]);
  } catch (error) {
    console.error('Get page detail error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Connect a new Facebook Page
router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { fbPageId, fbPageName, fbPageAccessToken, knowledgeBase, aiName } = req.body;

    if (!fbPageId || !fbPageName || !fbPageAccessToken) {
      return res.status(400).json({ error: 'fbPageId, fbPageName, and fbPageAccessToken are required' });
    }

    // Check if the page is already registered
    const existing = await db.select().from(pages).where(eq(pages.fbPageId, fbPageId)).limit(1);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'This Facebook Page is already connected.' });
    }

    // Enforce page connection limit based on user's active subscription package
    const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (userResult.length > 0) {
      const user = userResult[0];
      if (user.role !== 'admin' && user.packageId) {
        const pkgResult = await db.select().from(packages).where(eq(packages.id, user.packageId)).limit(1);
        if (pkgResult.length > 0) {
          const pkg = pkgResult[0];

          // Count pages already connected by this user
          const userPages = await db.select().from(pages).where(eq(pages.userId, userId));
          if (userPages.length >= pkg.maxPages) {
            return res.status(400).json({
              error: `ແພັກເກດຂອງທ່ານ (${pkg.name}) ອະນຸຍາດໃຫ້ເຊື່ອມຕໍ່ໄດ້ສູງສຸດ ${pkg.maxPages} ເພຈ໌.`
            });
          }
        }
      }
    }

    const newPageId = crypto.randomUUID();

    const activeAiConfigId = await resolveActiveAiConfigId();

    await db.insert(pages).values({
      id: newPageId,
      userId,
      fbPageId,
      fbPageName,
      fbPageAccessToken,
      knowledgeBase: knowledgeBase || '',
      aiName: aiName || 'ຜູ້ຊ່ວຍ AI',
      aiConfigId: activeAiConfigId,
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

// Update page details (knowledgeBase, isActive status, credentials)
router.put('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { knowledgeBase, isActive, fbPageName, fbPageId, fbPageAccessToken, aiName } = req.body;

    // Verify page ownership
    const page = await db.select().from(pages).where(and(eq(pages.id, id), eq(pages.userId, userId))).limit(1);
    if (page.length === 0) {
      return res.status(404).json({ error: 'Page connection not found or unauthorized' });
    }

    const updates: Partial<typeof pages.$inferInsert> = {};
    if (knowledgeBase !== undefined) updates.knowledgeBase = knowledgeBase;
    if (aiName !== undefined) updates.aiName = aiName;
    if (isActive !== undefined) updates.isActive = isActive;
    if (fbPageName !== undefined) updates.fbPageName = fbPageName;
    if (fbPageId !== undefined) {
      if (fbPageId !== page[0].fbPageId) {
        const existing = await db.select().from(pages).where(eq(pages.fbPageId, fbPageId)).limit(1);
        if (existing.length > 0) {
          return res.status(400).json({ error: 'Facebook Page ນີ້ຖືກເຊື່ອມຕໍ່ໄປແລ້ວ.' });
        }
      }
      updates.fbPageId = fbPageId;
    }
    if (fbPageAccessToken !== undefined) updates.fbPageAccessToken = fbPageAccessToken;

    await db.update(pages).set(updates).where(eq(pages.id, id));

    res.json({ message: 'Page connection updated successfully' });
  } catch (error) {
    console.error('Update page error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test unsaved Facebook Page connection credentials
router.post('/test-connection', async (req: AuthenticatedRequest, res) => {
  try {
    const { fbPageId, fbPageAccessToken } = req.body;
    if (!fbPageId || !fbPageAccessToken) {
      return res.status(400).json({ error: 'ກະລຸນາປ້ອນ Facebook Page ID ແລະ Access Token ເພື່ອທົດສອບ.' });
    }

    const testResult = await testFacebookPageConnection(fbPageId, fbPageAccessToken);
    if (!testResult.success) {
      return res.status(400).json({ error: testResult.error || 'ການເຊື່ອມຕໍ່ຫຼົ້ມເຫຼວ' });
    }

    res.json({ success: true, pageName: testResult.pageName, message: 'ການເຊື່ອມຕໍ່ສຳເລັດແລ້ວ!' });
  } catch (error) {
    console.error('Test unsaved connection error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test connection of a specific saved page connection
router.post('/:id/test-connection', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    // Verify page ownership
    const pageResult = await db.select().from(pages).where(and(eq(pages.id, id), eq(pages.userId, userId))).limit(1);
    if (pageResult.length === 0) {
      return res.status(404).json({ error: 'ບໍ່ພົບເພຈນີ້ ຫຼື ບໍ່ມີສິດເຂົ້າເຖິງ.' });
    }

    const page = pageResult[0];
    const testResult = await testFacebookPageConnection(page.fbPageId, page.fbPageAccessToken);
    
    if (!testResult.success) {
      return res.status(400).json({ error: testResult.error || 'ການເຊື່ອມຕໍ່ຫຼົ້ມເຫຼວ' });
    }

    res.json({ success: true, pageName: testResult.pageName, message: 'ການເຊື່ອມຕໍ່ສຳເລັດແລ້ວ!' });
  } catch (error) {
    console.error('Test page connection error:', error);
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
