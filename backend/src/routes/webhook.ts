import { Router } from 'express';
import { db, poolConnection } from '../config/db';
import { pages, customers, chatLogs, users, packages } from '../db/schema';
import { eq, and, desc, sql, inArray, gte } from 'drizzle-orm';
import { fetchUserProfile, sendTextMessage } from '../services/facebook';
import { generateAiResponse } from '../services/gemini';
import { authenticateToken } from '../middleware/auth';
import crypto from 'crypto';

const router = Router();

let bonusTokensColumnPromise: Promise<boolean> | null = null;
let userPackageColumnPromise: Promise<boolean> | null = null;

async function hasBonusTokensColumn() {
  if (!bonusTokensColumnPromise) {
    bonusTokensColumnPromise = poolConnection
      .query(
        `
          SELECT COUNT(*) AS count
          FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'users'
            AND COLUMN_NAME = 'bonus_tokens'
        `
      )
      .then(([rows]: any) => Number(rows?.[0]?.count || 0) > 0)
      .catch((error) => {
        bonusTokensColumnPromise = null;
        throw error;
      });
  }

  return bonusTokensColumnPromise;
}

async function hasUserPackageColumn() {
  if (!userPackageColumnPromise) {
    userPackageColumnPromise = poolConnection
      .query(
        `
          SELECT COUNT(*) AS count
          FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'users'
            AND COLUMN_NAME = 'package_id'
        `
      )
      .then(([rows]: any) => Number(rows?.[0]?.count || 0) > 0)
      .catch((error) => {
        userPackageColumnPromise = null;
        throw error;
      });
  }

  return userPackageColumnPromise;
}

function summarizeError(error: any) {
  return {
    code: error?.code || error?.errno || error?.name || 'UNKNOWN_ERROR',
    message: error?.sqlMessage || error?.message || 'Unknown error',
    sqlState: error?.sqlState,
  };
}

function simulatorErrorResponse(stage: string, error: any) {
  const summary = summarizeError(error);
  return {
    error: `Simulation failed at ${stage}: ${summary.message}`,
    stage,
    code: summary.code,
    sqlState: summary.sqlState,
  };
}

async function getPageByFacebookId(fbPageId: string) {
  const [rows]: any = await poolConnection.query(
    `
      SELECT \`id\`, \`user_id\` AS \`userId\`, \`fb_page_id\` AS \`fbPageId\`, \`fb_page_name\` AS \`fbPageName\`,
             \`fb_page_access_token\` AS \`fbPageAccessToken\`, \`knowledge_base\` AS \`knowledgeBase\`,
             \`ai_name\` AS \`aiName\`, \`is_active\` AS \`isActive\`
      FROM \`pages\`
      WHERE \`fb_page_id\` = ?
      LIMIT 1
    `,
    [fbPageId]
  );

  return rows?.[0] || null;
}

async function getCustomerByPageAndPsid(pageId: string, senderPsid: string) {
  const [rows]: any = await poolConnection.query(
    `
      SELECT \`id\`, \`page_id\` AS \`pageId\`, \`fb_psid\` AS \`fbPsid\`, \`full_name\` AS \`fullName\`,
             \`first_name\` AS \`firstName\`, \`last_name\` AS \`lastName\`, \`notes\`
      FROM \`customers\`
      WHERE \`page_id\` = ? AND \`fb_psid\` = ?
      LIMIT 1
    `,
    [pageId, senderPsid]
  );

  return rows?.[0] || null;
}

async function getCustomerLogs(customerId: string) {
  const [rows]: any = await poolConnection.query(
    `
      SELECT \`id\`, \`message_in\` AS \`messageIn\`, \`message_out\` AS \`messageOut\`,
             \`token_count\` AS \`tokenCount\`, \`created_at\` AS \`createdAt\`
      FROM \`chat_logs\`
      WHERE \`customer_id\` = ?
      ORDER BY \`created_at\` DESC
      LIMIT 5
    `,
    [customerId]
  );

  return rows || [];
}

async function getPageOwner(pageUserId: string) {
  const includePackageId = await hasUserPackageColumn();
  const includeBonusTokens = await hasBonusTokensColumn();

  const selectColumns = [
    '`id`',
    '`name`',
    '`email`',
    '`role`',
  ];

  if (includePackageId) selectColumns.push('`package_id` AS `packageId`');
  if (includeBonusTokens) selectColumns.push('`bonus_tokens` AS `bonusTokens`');

  const [rows]: any = await poolConnection.query(
    `SELECT ${selectColumns.join(', ')} FROM \`users\` WHERE \`id\` = ? LIMIT 1`,
    [pageUserId]
  );

  return rows?.[0] || null;
}

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
  let stage = 'start';
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  try {
    stage = 'load_page';
    const page = await getPageByFacebookId(fbPageId);
    if (!page) {
      console.warn(`[Webhook Processor] Page with Facebook ID ${fbPageId} not found in DB.`);
      return null;
    }

    if (!page.isActive) {
      console.log(`[Webhook Processor] Page "${page.fbPageName}" is currently deactivated.`);
      return null;
    }

    stage = 'load_customer';
    let customer = await getCustomerByPageAndPsid(page.id, senderPsid);

    let customerId: string;
    let customerName = 'Guest User';
    let customerNotes = '';

    if (!customer) {
      customerId = crypto.randomUUID();

      if (isSimulator) {
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
      customerId = customer.id;
      customerName = customer.fullName || 'Guest User';
      customerNotes = customer.notes || '';
    }

    stage = 'load_chat_history';
    const previousLogs = await getCustomerLogs(customerId);
    const chatHistory = previousLogs
      .reverse()
      .map((log: any) => [
        { role: 'user' as const, text: log.messageIn },
        { role: 'model' as const, text: log.messageOut },
      ])
      .flat();

    stage = 'load_owner';
    const owner = await getPageOwner(page.userId);
    if (owner && owner.role !== 'admin' && owner.packageId) {
      const pkgResult = await db.select().from(packages).where(eq(packages.id, owner.packageId)).limit(1);
      if (pkgResult.length > 0) {
        const pkg = pkgResult[0];
        const ownerPages = await db.select({ id: pages.id }).from(pages).where(eq(pages.userId, owner.id));
        const ownerPageIds = ownerPages.map((p) => p.id);

        if (ownerPageIds.length > 0) {
          const usageResult = await db
            .select({
              totalTokens: sql<number>`COALESCE(SUM(${chatLogs.tokenCount}), 0)`
            })
            .from(chatLogs)
            .where(and(inArray(chatLogs.pageId, ownerPageIds), gte(chatLogs.createdAt, monthStart)));

          const totalUsed = Number(usageResult[0]?.totalTokens || 0);
          const bonusTokens = Number(owner.bonusTokens || 0);
          const totalAllowance = Number(pkg.maxTokens || 0) + bonusTokens;

          if (totalUsed >= totalAllowance) {
            console.warn(`[Webhook Processor] User ${owner.name} (${owner.email}) has exceeded token limit. Used: ${totalUsed}/${totalAllowance}`);
            const limitReply = 'ຂໍອະໄພໃນຄວາມບໍ່ສະດວກ, ຂະນະນີ້ລະບົບຕອບກັບອັດຕະໂນມັດກຳລັງປັບປຸງຊົ່ວຄາວ. ຜູ້ດູແລລະບົບ (ແອດມິນ) ຈະຕິດຕໍ່ກັບຫາທ່ານໂດຍໄວທີ່ສຸດ.';
            const sendSuccess = await sendTextMessage(senderPsid, limitReply, page.fbPageAccessToken);

            await db.insert(chatLogs).values({
              id: crypto.randomUUID(),
              pageId: page.id,
              customerId,
              messageIn: messageText,
              messageOut: limitReply,
              tokenCount: 0,
            });

            return { customerName, reply: limitReply, sent: sendSuccess };
          }
        }
      }
    }

    stage = 'generate_ai';
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

    stage = 'send_message';
    const sendSuccess = await sendTextMessage(senderPsid, aiReplyText, page.fbPageAccessToken);

    stage = 'log_chat';
    await db.insert(chatLogs).values({
      id: crypto.randomUUID(),
      pageId: page.id,
      customerId,
      messageIn: messageText,
      messageOut: aiReplyText,
      tokenCount: tokenCount,
    });

    if (owner && owner.role !== 'admin' && owner.packageId && tokenCount > 0) {
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

    return { customerName, reply: aiReplyText, sent: sendSuccess };
  } catch (error) {
    console.error(`[Webhook Processor] Failed at stage ${stage}:`, error);
    if (error && typeof error === 'object') {
      (error as any).stage = stage;
    }
    throw error;
  }
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
    const summary = summarizeError(error);
    const stage = (error as any)?.stage || 'unknown';
    res.status(500).json({
      error: `ການຈຳລອງຂໍ້ຄວາມລົ້ມທີ່ stage "${stage}": ${summary.message}`,
      stage,
      code: summary.code,
      sqlState: summary.sqlState,
    });
  }
});

export default router;
