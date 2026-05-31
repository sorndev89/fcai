import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../config/db';
import { aiConfig } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import crypto from 'crypto';
import { callAiProvider } from '../services/gemini';

const router = Router();

// Apply auth middleware
router.use(authenticateToken as any);

// Admin-only middleware
function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
}

/**
 * GET /api/admin/ai-config
 * Returns the current active AI configuration(s).
 * If no config exists, returns an empty array.
 */
router.get('/', requireAdmin as any, async (req: AuthenticatedRequest, res) => {
  try {
    const configs = await db.select().from(aiConfig).orderBy(desc(aiConfig.createdAt));
    res.json(configs);
  } catch (error) {
    console.error('[AI Config API] Error fetching configs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/ai-config
 * Create a new AI configuration entry.
 * Body: { provider, modelName, apiKey, baseUrl?, isActive? }
 */
router.post('/', requireAdmin as any, async (req: AuthenticatedRequest, res) => {
  try {
    const { provider, modelName, apiKey, baseUrl, isActive } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: 'apiKey is required' });
    }

    const id = crypto.randomUUID();

    // If this config is set as active, deactivate all others first
    if (isActive) {
      await db.update(aiConfig).set({ isActive: false });
    }

    await db.insert(aiConfig).values({
      id,
      provider: provider || 'gemini',
      modelName: modelName || 'gemini-2.0-flash',
      apiKey,
      baseUrl: baseUrl || null,
      isActive: isActive !== undefined ? isActive : true,
    });

    const created = await db.select().from(aiConfig).where(eq(aiConfig.id, id)).limit(1);
    res.status(201).json(created[0]);
  } catch (error) {
    console.error('[AI Config API] Error creating config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/admin/ai-config/:id
 * Update an existing AI configuration.
 */
router.put('/:id', requireAdmin as any, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { provider, modelName, apiKey, baseUrl, isActive } = req.body;

    // If setting this config as active, deactivate all others first
    if (isActive) {
      await db.update(aiConfig).set({ isActive: false });
    }

    const updateData: Record<string, any> = {};
    if (provider !== undefined) updateData.provider = provider;
    if (modelName !== undefined) updateData.modelName = modelName;
    if (apiKey !== undefined) updateData.apiKey = apiKey;
    if (baseUrl !== undefined) updateData.baseUrl = baseUrl;
    if (isActive !== undefined) updateData.isActive = isActive;

    await db.update(aiConfig).set(updateData).where(eq(aiConfig.id, id));

    const updated = await db.select().from(aiConfig).where(eq(aiConfig.id, id)).limit(1);
    if (!updated.length) {
      return res.status(404).json({ error: 'AI Config not found' });
    }

    res.json(updated[0]);
  } catch (error) {
    console.error('[AI Config API] Error updating config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/admin/ai-config/:id/toggle
 * Toggle a specific AI config as active/inactive.
 */
router.put('/:id/toggle', requireAdmin as any, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    const existing = await db.select().from(aiConfig).where(eq(aiConfig.id, id)).limit(1);
    if (!existing.length) {
      return res.status(404).json({ error: 'AI Config not found' });
    }

    const newActiveState = !existing[0].isActive;

    // If activating this config, deactivate all others
    if (newActiveState) {
      await db.update(aiConfig).set({ isActive: false });
    }

    await db.update(aiConfig).set({ isActive: newActiveState }).where(eq(aiConfig.id, id));

    const updated = await db.select().from(aiConfig).where(eq(aiConfig.id, id)).limit(1);
    res.json(updated[0]);
  } catch (error) {
    console.error('[AI Config API] Error toggling config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/admin/ai-config/:id
 * Delete an AI configuration.
 */
router.delete('/:id', requireAdmin as any, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    await db.delete(aiConfig).where(eq(aiConfig.id, id));
    res.json({ message: 'AI Config deleted successfully' });
  } catch (error) {
    console.error('[AI Config API] Error deleting config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/ai-config/active (no auth required - used by webhook/Gemini service)
 * Returns the currently active AI configuration.
 * This can be used by the backend services to dynamically get the API key.
 */
router.get('/active', async (req, res) => {
  try {
    const configs = await db.select().from(aiConfig).where(eq(aiConfig.isActive, true)).limit(1);
    if (!configs.length) {
      return res.status(404).json({ error: 'No active AI configuration found' });
    }
    // Never expose the full API key in response
    const active = configs[0];
    res.json({
      id: active.id,
      provider: active.provider,
      modelName: active.modelName,
      apiKeyMasked: active.apiKey ? `${active.apiKey.substring(0, 4)}...${active.apiKey.substring(active.apiKey.length - 4)}` : '',
      baseUrl: active.baseUrl,
      isActive: active.isActive,
      updatedAt: active.updatedAt,
      createdAt: active.createdAt,
    });
  } catch (error) {
    console.error('[AI Config API] Error fetching active config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/ai-config/test
 * Test an AI configuration connection.
 * Body: { provider, modelName, apiKey, baseUrl }
 */
router.post('/test', requireAdmin as any, async (req: AuthenticatedRequest, res) => {
  try {
    const { provider, modelName, apiKey, baseUrl } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: 'apiKey is required for testing' });
    }

    const testConfig = {
      provider: provider || 'gemini',
      modelName: modelName || 'gemini-2.0-flash',
      apiKey,
      baseUrl: baseUrl || null,
    };

    console.log(`[AI Config Test] Testing connection for provider: ${testConfig.provider}, model: ${testConfig.modelName}`);

    // Call provider with a simple prompt
    const systemInstruction = 'You are an API connection test assistant. Respond with exactly: "Success".';
    const userMessage = 'Test connection.';

    const result = await callAiProvider(testConfig, systemInstruction, [], userMessage, 0.1);

    res.json({
      success: true,
      message: 'Connection test passed.',
      response: result.text.trim()
    });
  } catch (error: any) {
    console.error('[AI Config Test] Connection test failed:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'API connection test failed. Check your API Key or Base URL.'
    });
  }
});

export default router;
