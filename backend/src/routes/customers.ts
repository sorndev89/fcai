import { Router } from 'express';
import { db } from '../config/db';
import { customers, chatLogs, pages } from '../db/schema';
import { eq, and, asc, desc } from 'drizzle-orm';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { extractOrderSummary } from '../services/gemini';

const router = Router();

router.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Apply auth middleware to all routes
router.use(authenticateToken as any);

// Helper to verify user owns the page
async function verifyPageOwnership(pageId: string, userId: string): Promise<boolean> {
  const result = await db.select().from(pages).where(and(eq(pages.id, pageId), eq(pages.userId, userId))).limit(1);
  return result.length > 0;
}

function normalizeCustomerRow(customer: any) {
  return {
    ...customer,
    profilePic: customer.profilePic || null,
    phoneNumber: customer.phoneNumber || null,
    email: customer.email || null,
    address: customer.address || null,
    notes: customer.notes || null,
  };
}

// Get all customers for a connected page
router.get('/page/:pageId', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { pageId } = req.params;

    const ownsPage = await verifyPageOwnership(pageId, userId);
    if (!ownsPage) {
      return res.status(403).json({ error: 'Unauthorized access to this page' });
    }

    const pageCustomers = await db
      .select()
      .from(customers)
      .where(eq(customers.pageId, pageId))
      .orderBy(desc(customers.createdAt), asc(customers.fullName));

    res.status(200).json(pageCustomers.map(normalizeCustomerRow));
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get customer details by ID
router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    // Fetch customer details
    const customerResult = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
    if (customerResult.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    const customer = customerResult[0];

    // Verify user owns the page this customer belongs to
    const ownsPage = await verifyPageOwnership(customer.pageId, userId);
    if (!ownsPage) {
      return res.status(403).json({ error: 'Unauthorized access to this customer data' });
    }

    res.status(200).json(normalizeCustomerRow(customer));
  } catch (error) {
    console.error('Get customer by id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update customer details (phone, email, address, notes)
router.put('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { phoneNumber, email, address, notes } = req.body;

    // Fetch customer to check existence and ownership
    const customerResult = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
    if (customerResult.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    const customer = customerResult[0];

    const ownsPage = await verifyPageOwnership(customer.pageId, userId);
    if (!ownsPage) {
      return res.status(403).json({ error: 'Unauthorized access to update this customer' });
    }

    const updates: Partial<typeof customers.$inferInsert> = {};
    if (phoneNumber !== undefined) updates.phoneNumber = phoneNumber;
    if (email !== undefined) updates.email = email;
    if (address !== undefined) updates.address = address;
    if (notes !== undefined) updates.notes = notes;

    await db.update(customers).set(updates).where(eq(customers.id, id));

    res.json({ message: 'Customer updated successfully' });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get chat logs history for a customer
router.get('/:id/chats', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    // Fetch customer to verify ownership
    const customerResult = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
    if (customerResult.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    const customer = customerResult[0];

    const ownsPage = await verifyPageOwnership(customer.pageId, userId);
    if (!ownsPage) {
      return res.status(403).json({ error: 'Unauthorized access to these chat logs' });
    }

    // Get logs in ascending order (oldest first, chronological)
    const logs = await db.select().from(chatLogs).where(eq(chatLogs.customerId, id)).orderBy(asc(chatLogs.createdAt));

    res.json(logs);
  } catch (error) {
    console.error('Get customer chats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/customers/:id/order-summary
router.post('/:id/order-summary', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    // Fetch customer to verify ownership
    const customerResult = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
    if (customerResult.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    const customer = customerResult[0];

    const ownsPage = await verifyPageOwnership(customer.pageId, userId);
    if (!ownsPage) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    // Retrieve recent chronological chat logs
    const logs = await db.select().from(chatLogs).where(eq(chatLogs.customerId, id)).orderBy(asc(chatLogs.createdAt));
    
    // Format logs for AI prompt context
    const chatLogsText = logs.map(l => `Customer: ${l.messageIn}\nAI: ${l.messageOut}`).join('\n');

    // Run AI structured extraction
    const result = await extractOrderSummary(chatLogsText);
    
    res.json(result);
  } catch (error) {
    console.error('Extract order summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
