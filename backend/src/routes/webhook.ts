import { Router } from 'express';
import { db } from '../config/db';
import { pages, customers, chatLogs, users, packages } from '../db/schema';
import { eq, and, desc, sql, inArray, gte } from 'drizzle-orm';
import { fetchUserProfile, sendTextMessage } from '../services/facebook';
import { generateAiResponse } from '../services/gemini';
import { authenticateToken } from '../middleware/auth';
import crypto from 'crypto';

const router = Router();

// Facebook Webhook Verification (GET /webhook/facebook)
router.get('/', (req, res) => {
  const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || 'my-chatbot-verify-token-12345';

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[Facebook Webhook] Webhook verified successfully!');
      return res.status(200).send(challenge);
    } else {
      console.warn('[Facebook Webhook] Verification failed. Token mismatch.');
      return res.sendStatus(403);
    }
  }
  return res.sendStatus(400);
});

// Main Message Processor Helper
export async function processIncomingMessage(fbPageId: string, senderPsid: string, messageText: string, isSimulator = false) {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  // 1. Fetch the connected page from DB
  const pageResult = await db.select().from(pages).where(eq(pages.fbPageId, fbPageId)).limit(1);
  if (pageResult.length === 0) {
    console.warn(`[Webhook Processor] Page with Facebook ID ${fbPageId} not found in DB.`);
    return null;
  }

  const page = pageResult[0];
  if (!page.isActive) {
    console.log(`[Webhook Processor] Page "${page.fbPageName}" is currently deactivated.`);
    return null;
  }

  // 2. Fetch or create Customer Profile
  let customerResult = await db
    .select()
    .from(customers)
    .where(and(eq(customers.fbPsid, senderPsid), eq(customers.pageId, page.id)))
    .limit(1);

  let customerId: string;
  let customerName = 'Guest User';
  let customerNotes = '';

  if (customerResult.length === 0) {
    customerId = crypto.randomUUID();

    if (isSimulator) {
      // Simulator: skip Facebook API call, create a local guest profile
      customerName = `Simulator User (${senderPsid})`;
      await db.insert(customers).values({
        id: customerId,
        pageId: page.id,
        fbPsid: senderPsid,
        fullName: customerName,
        firstName: 'Simulator',
        lastName: senderPsid,
      });
    } else {
      console.log(`[Webhook Processor] New customer detected. Fetching Facebook profile for PSID: ${senderPsid}`);
      const fbProfile = await fetchUserProfile(senderPsid, page.fbPageAccessToken);
      customerName = fbProfile.fullName;

      await db.insert(customers).values({
        id: customerId,
        pageId: page.id,
        fbPsid: senderPsid,
        fullName: fbProfile.fullName,
        firstName: fbProfile.firstName,
        lastName: fbProfile.lastName,
        profilePic: fbProfile.profilePic,
      });
    }
  } else {
    customerId = customerResult[0].id;
    customerName = customerResult[0].fullName || 'Guest User';
    customerNotes = customerResult[0].notes || '';
  }

  // 3. Retrieve recent conversation logs to give AI memory context
  const previousLogs = await db
    .select()
    .from(chatLogs)
    .where(eq(chatLogs.customerId, customerId))
    .orderBy(desc(chatLogs.createdAt))
    .limit(5);

  // Map to format required by Gemini service (oldest first)
  const chatHistory = previousLogs
    .reverse()
    .map((log) => [
      { role: 'user' as const, text: log.messageIn },
      { role: 'model' as const, text: log.messageOut },
    ])
    .flat();

  // Token Limit Enforcement Check
  const pageOwnerResult = await db.select().from(users).where(eq(users.id, page.userId)).limit(1);
  if (pageOwnerResult.length > 0) {
    const owner = pageOwnerResult[0];
    if (owner.role !== 'admin' && owner.packageId) {
      const pkgResult = await db.select().from(packages).where(eq(packages.id, owner.packageId)).limit(1);
      if (pkgResult.length > 0) {
        const pkg = pkgResult[0];

        // 1. Find all pages owned by this tenant
        const ownerPages = await db.select({ id: pages.id }).from(pages).where(eq(pages.userId, owner.id));
        const ownerPageIds = ownerPages.map(p => p.id);

        if (ownerPageIds.length > 0) {
          // 2. Sum the tokens consumed across all their pages
          const usageResult = await db
            .select({
              totalTokens: sql<number>`COALESCE(SUM(${chatLogs.tokenCount}), 0)`
            })
            .from(chatLogs)
            .where(and(inArray(chatLogs.pageId, ownerPageIds), gte(chatLogs.createdAt, monthStart)));

          const totalUsed = Number(usageResult[0]?.totalTokens || 0);
          const bonusTokens = Number(owner.bonusTokens || 0);
          const totalAllowance = Number(pkg.maxTokens || 0) + bonusTokens;

          // 3. Block AI if usage exceeds monthly allowance + purchased token bonus
          if (totalUsed >= totalAllowance) {
            console.warn(`[Webhook Processor] User ${owner.name} (${owner.email}) has exceeded token limit. Used: ${totalUsed}/${totalAllowance}`);
            const limitReply = "ຂໍອະໄພໃນຄວາມບໍ່ສະດວກ, ຂະນະນີ້ລະບົບຕອບກັບອັດຕະໂນມັດກຳລັງປັບປຸງຊົ່ວຄາວ. ຜູ້ດູແລລະບົບ (ແອດມິນ) ຈະຕິດຕໍ່ກັບຫາທ່ານໂດຍໄວທີ່ສຸດ.";
            
            // Send notice back to Facebook so the end-user knows
            const sendSuccess = await sendTextMessage(senderPsid, limitReply, page.fbPageAccessToken);

            // Log blocked conversation in ChatLogs with 0 tokens
            await db.insert(chatLogs).values({
              id: crypto.randomUUID(),
              pageId: page.id,
              customerId: customerId,
              messageIn: messageText,
              messageOut: limitReply,
              tokenCount: 0,
            });

            return { customerName, reply: limitReply, sent: sendSuccess };
          }
        }
      }
    }
  }

  // 4. Call Gemini AI to generate response (now returns { text, tokenCount })
  const aiResult = await generateAiResponse(
    messageText,
    page.knowledgeBase,
    customerName,
    customerNotes,
    chatHistory,
    page.aiName || undefined,
    page.aiConfigId || null
  );

  const aiReplyText = aiResult.text;
  const tokenCount = aiResult.tokenCount;

  // 5. Send message back to Facebook
  const sendSuccess = await sendTextMessage(senderPsid, aiReplyText, page.fbPageAccessToken);

  // 6. Log conversation in ChatLogs with token count
  await db.insert(chatLogs).values({
    id: crypto.randomUUID(),
    pageId: page.id,
    customerId: customerId,
    messageIn: messageText,
    messageOut: aiReplyText,
    tokenCount: tokenCount,
  });

  if (pageOwnerResult.length > 0) {
    const owner = pageOwnerResult[0];
    if (owner.role !== 'admin' && owner.packageId && tokenCount > 0) {
      const pkgResult = await db.select().from(packages).where(eq(packages.id, owner.packageId)).limit(1);
      if (pkgResult.length > 0) {
        const pkg = pkgResult[0];
        const ownerPages = await db.select({ id: pages.id }).from(pages).where(eq(pages.userId, owner.id));
        const ownerPageIds = ownerPages.map((p) => p.id);

        if (ownerPageIds.length > 0) {
          const afterUsageResult = await db
            .select({
              totalTokens: sql<number>`COALESCE(SUM(${chatLogs.tokenCount}), 0)`
            })
            .from(chatLogs)
            .where(and(inArray(chatLogs.pageId, ownerPageIds), gte(chatLogs.createdAt, monthStart)));

          const afterUsed = Number(afterUsageResult[0]?.totalTokens || 0);
          const beforeUsed = Math.max(0, afterUsed - tokenCount);
          const overflowBefore = Math.max(0, beforeUsed - Number(pkg.maxTokens || 0));
          const overflowAfter = Math.max(0, afterUsed - Number(pkg.maxTokens || 0));
          const bonusConsumed = Math.max(0, overflowAfter - overflowBefore);

          if (bonusConsumed > 0) {
            const currentBonus = Number(owner.bonusTokens || 0);
            await db
              .update(users)
              .set({ bonusTokens: Math.max(0, currentBonus - bonusConsumed) })
              .where(eq(users.id, owner.id));
          }
        }
      }
    }
  }

  return { customerName, reply: aiReplyText, sent: sendSuccess };
}

// Facebook Incoming Messages webhook (POST /webhook/facebook)
router.post('/', async (req, res) => {
  const body = req.body;

  if (body.object === 'page') {
    try {
      for (const entry of body.entry) {
        const webhookEvent = entry.messaging[0];
        console.log('[Facebook Webhook] Event received:', JSON.stringify(webhookEvent));

        const senderPsid = webhookEvent.sender.id;
        const recipientPageId = webhookEvent.recipient.id; // page ID
        const messageText = webhookEvent.message?.text;

        if (senderPsid && recipientPageId && messageText) {
          // Process asynchronously
          processIncomingMessage(recipientPageId, senderPsid, messageText).catch((err) =>
            console.error('[Webhook Processor] Background processing error:', err)
          );
        }
      }
      res.status(200).send('EVENT_RECEIVED');
    } catch (error) {
      console.error('[Facebook Webhook] Error processing webhook POST:', error);
      res.sendStatus(500);
    }
  } else {
    res.sendStatus(404);
  }
});

// Simulator Endpoint for Testing Without Facebook (POST /webhook/facebook/simulate)
// Requires authentication so only logged-in users can use the simulator
router.post('/simulate', authenticateToken as any, async (req, res) => {
  const { fbPageId, senderPsid, messageText } = req.body;

  if (!fbPageId || !senderPsid || !messageText) {
    return res.status(400).json({ error: 'fbPageId, senderPsid, and messageText are required.' });
  }

  try {
    console.log(`[Simulator] Simulated message from PSID ${senderPsid} to Page ${fbPageId}: "${messageText}"`);
    // Pass isSimulator=true so no Facebook API profile call is made
    const result = await processIncomingMessage(fbPageId, senderPsid, messageText, true);

    if (!result) {
      return res.status(400).json({ error: 'Failed to process. Page connection not found or deactivated.' });
    }

    res.json({
      message: 'Simulated response generated and stored successfully.',
      customerName: result.customerName,
      reply: result.reply,
      facebookDeliveryStatus: 'Simulator (not sent to Facebook)',
    });
  } catch (error) {
    console.error('[Simulator] Error processing simulation:', error);
    res.status(500).json({ error: 'Internal server error during simulation.' });
  }
});

export default router;
