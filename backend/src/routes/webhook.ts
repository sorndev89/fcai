import { Router } from 'express';
import { db } from '../config/db';
import { pages, customers, chatLogs } from '../db/schema';
import { eq, and, desc, asc } from 'drizzle-orm';
import { fetchUserProfile, sendTextMessage } from '../services/facebook';
import { generateAiResponse } from '../services/gemini';
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
export async function processIncomingMessage(fbPageId: string, senderPsid: string, messageText: string) {
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
    console.log(`[Webhook Processor] New customer detected. Fetching Facebook profile for PSID: ${senderPsid}`);
    const fbProfile = await fetchUserProfile(senderPsid, page.fbPageAccessToken);

    customerId = crypto.randomUUID();
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

  // 4. Call Gemini AI to generate response (now returns { text, tokenCount })
  const aiResult = await generateAiResponse(
    messageText,
    page.knowledgeBase,
    customerName,
    customerNotes,
    chatHistory
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
router.post('/simulate', async (req, res) => {
  const { fbPageId, senderPsid, messageText } = req.body;

  if (!fbPageId || !senderPsid || !messageText) {
    return res.status(400).json({ error: 'fbPageId, senderPsid, and messageText are required.' });
  }

  try {
    console.log(`[Simulator] Simulated message from PSID ${senderPsid} to Page ${fbPageId}: "${messageText}"`);
    const result = await processIncomingMessage(fbPageId, senderPsid, messageText);

    if (!result) {
      return res.status(400).json({ error: 'Failed to process. Page connection not found or inactive.' });
    }

    res.json({
      message: 'Simulated response generated and stored successfully.',
      customerName: result.customerName,
      aiReply: result.reply,
      facebookDeliveryStatus: result.sent ? 'Success/Simulated' : 'Failed',
    });
  } catch (error) {
    console.error('[Simulator] Error processing simulation:', error);
    res.status(500).json({ error: 'Internal server error during simulation.' });
  }
});

export default router;
