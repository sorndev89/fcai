import { Router } from 'express';
import { db } from '../config/db';
import { pages, users } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import crypto from 'crypto';

const router = Router();

// ──────────────────────────────────────────────
//  Facebook OAuth Configuration
// ──────────────────────────────────────────────
const FB_APP_ID = process.env.FB_APP_ID || '';
const FB_APP_SECRET = process.env.FB_APP_SECRET || '';
const FB_API_VERSION = 'v19.0';
const FB_GRAPH_BASE = `https://graph.facebook.com/${FB_API_VERSION}`;
const FB_OAUTH_BASE = 'https://www.facebook.com';

/**
 * Determine the OAuth redirect URI based on environment.
 * In development, Facebook redirects to localhost.
 * In production, Facebook redirects to the live domain.
 */
function getRedirectUri(req: any): string {
  const host = req.get('host') || 'localhost:5002';
  const protocol = req.protocol || (host.includes('localhost') ? 'http' : 'https');
  return `${protocol}://${host}/api/auth/facebook/callback`;
}

// ──────────────────────────────────────────────
//  Step 1: Redirect user to Facebook Login
//  GET /api/auth/facebook/login
// ──────────────────────────────────────────────
router.get('/login', authenticateToken as any, (req: AuthenticatedRequest, res) => {
  if (!FB_APP_ID || !FB_APP_SECRET) {
    return res.status(500).json({ error: 'Facebook App ID or Secret not configured. Set FB_APP_ID and FB_APP_SECRET in .env' });
  }

  const redirectUri = getRedirectUri(req);
  const state = crypto.randomBytes(16).toString('hex'); // CSRF protection

  // Store state in session / or pass as cookie for verification
  // For simplicity, we store in a cookie
  res.cookie('fb_oauth_state', state, {
    httpOnly: true,
    secure: !req.hostname.includes('localhost'),
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000, // 10 minutes
  });

  const scope = [
    'pages_show_list',
    'pages_manage_metadata',
    'pages_messaging',
    'pages_read_engagement',
  ].join(',');

  const authUrl = `${FB_OAUTH_BASE}/dialog/oauth?` +
    `client_id=${FB_APP_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&state=${state}` +
    `&response_type=code`;

  console.log(`[Facebook OAuth] Redirecting user to: ${authUrl}`);
  res.json({ redirectUrl: authUrl });
});

// ──────────────────────────────────────────────
//  Step 2: Facebook redirects back here
//  GET /api/auth/facebook/callback
// ──────────────────────────────────────────────
router.get('/callback', authenticateToken as any, async (req: AuthenticatedRequest, res) => {
  const { code, state } = req.query;
  const storedState = req.cookies?.fb_oauth_state;

  try {
    // Verify state (CSRF protection)
    if (!storedState || state !== storedState) {
      console.warn('[Facebook OAuth] State mismatch - possible CSRF attack');
      // Redirect to frontend with error
      return res.redirect(`${getFrontendUrl(req)}/dashboard/pages?oauth_error=state_mismatch`);
    }

    // Clear state cookie
    res.clearCookie('fb_oauth_state');

    if (!code) {
      return res.redirect(`${getFrontendUrl(req)}/dashboard/pages?oauth_error=no_code`);
    }

    const redirectUri = getRedirectUri(req);
    const userId = req.user!.userId;

    // ── Exchange code for short-lived User Access Token ──
    console.log('[Facebook OAuth] Exchanging code for access token...');
    const tokenUrl = `${FB_GRAPH_BASE}/oauth/access_token?` +
      `client_id=${FB_APP_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&client_secret=${FB_APP_SECRET}` +
      `&code=${code}`;

    const tokenResponse = await fetch(tokenUrl);
    const tokenData = await tokenResponse.json() as any;

    if (!tokenResponse.ok || tokenData.error) {
      console.error('[Facebook OAuth] Token exchange failed:', tokenData);
      return res.redirect(`${getFrontendUrl(req)}/dashboard/pages?oauth_error=token_exchange_failed`);
    }

    const shortLivedToken = tokenData.access_token;

    // ── Exchange short-lived token for long-lived token ──
    console.log('[Facebook OAuth] Exchanging for long-lived token...');
    const longTokenUrl = `${FB_GRAPH_BASE}/oauth/access_token?` +
      `grant_type=fb_exchange_token` +
      `&client_id=${FB_APP_ID}` +
      `&client_secret=${FB_APP_SECRET}` +
      `&fb_exchange_token=${shortLivedToken}`;

    const longTokenResponse = await fetch(longTokenUrl);
    const longTokenData = await longTokenResponse.json() as any;

    if (!longTokenResponse.ok || longTokenData.error) {
      console.error('[Facebook OAuth] Long-lived token exchange failed:', longTokenData);
      return res.redirect(`${getFrontendUrl(req)}/dashboard/pages?oauth_error=long_token_failed`);
    }

    const userAccessToken = longTokenData.access_token;
    const expiresIn = longTokenData.expires_in || 5184000; // Default 60 days in seconds

    // Calculate expiry date
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // ── Fetch user's Facebook pages ──
    console.log('[Facebook OAuth] Fetching user pages...');
    const pagesUrl = `${FB_GRAPH_BASE}/me/accounts?access_token=${userAccessToken}`;
    const pagesResponse = await fetch(pagesUrl);
    const pagesData = await pagesResponse.json() as any;

    if (!pagesResponse.ok || pagesData.error) {
      console.error('[Facebook OAuth] Failed to fetch pages:', pagesData);
      return res.redirect(`${getFrontendUrl(req)}/dashboard/pages?oauth_error=pages_fetch_failed`);
    }

    const fbPages = pagesData.data || [];
    let connectedCount = 0;

    // ── Store each page in our database ──
    for (const fbPage of fbPages) {
      const fbPageId = fbPage.id;
      const fbPageName = fbPage.name || 'Unknown Page';
      const fbPageAccessToken = fbPage.access_token;

      if (!fbPageId || !fbPageAccessToken) continue;

      // Check if page already exists
      const existing = await db.select().from(pages).where(eq(pages.fbPageId, fbPageId)).limit(1);

      if (existing.length === 0) {
        // Check page limit
        const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (userResult.length > 0) {
          const user = userResult[0];
          // If tenant user, check package limits (handled by POST /api/pages)
          // For simplicity, we just insert and let the limit be enforced on the frontend
        }

        // Insert new page connection
        await db.insert(pages).values({
          id: crypto.randomUUID(),
          userId,
          fbPageId,
          fbPageName,
          fbPageAccessToken,
          fbUserAccessToken: userAccessToken,
          fbTokenExpiresAt: expiresAt,
          knowledgeBase: '',
          isActive: true,
        });

        connectedCount++;
      } else {
        // Update existing page's tokens
        await db.update(pages)
          .set({
            fbPageAccessToken,
            fbUserAccessToken: userAccessToken,
            fbTokenExpiresAt: expiresAt,
          })
          .where(eq(pages.fbPageId, fbPageId));
      }
    }

    console.log(`[Facebook OAuth] Successfully connected ${connectedCount} new page(s)`);

    // Redirect back to frontend with success
    return res.redirect(
      `${getFrontendUrl(req)}/dashboard/pages?oauth_success=true&connected=${connectedCount}`
    );

  } catch (error: any) {
    console.error('[Facebook OAuth] Unexpected error:', error);
    return res.redirect(`${getFrontendUrl(req)}/dashboard/pages?oauth_error=unexpected`);
  }
});

// ──────────────────────────────────────────────
//  Helper: Get frontend URL for redirects
// ──────────────────────────────────────────────
function getFrontendUrl(req: any): string {
  const host = req.get('host') || 'localhost:5002';

  // In production, frontend is served on the same domain
  if (!host.includes('localhost') && !host.includes('127.0.0.1')) {
    return `${req.protocol}://${host}`;
  }

  // In development, frontend runs on Nuxt dev server (port 3000)
  return 'http://localhost:3000';
}

// ──────────────────────────────────────────────
//  Refresh Page Access Token
//  (For future use - automatic token refresh)
// ──────────────────────────────────────────────
export async function refreshPageAccessToken(pageId: string): Promise<string | null> {
  try {
    const pageResult = await db.select().from(pages).where(eq(pages.id, pageId)).limit(1);
    if (pageResult.length === 0) return null;

    const page = pageResult[0];
    if (!page.fbUserAccessToken) return null;

    // Check if user access token is still valid
    const tokenUrl = `${FB_GRAPH_BASE}/debug_token?` +
      `input_token=${page.fbUserAccessToken}` +
      `&access_token=${FB_APP_ID}|${FB_APP_SECRET}`;

    const debugResponse = await fetch(tokenUrl);
    const debugData = await debugResponse.json() as any;

    if (debugData.data?.is_valid) {
      // User token still valid, use it to get fresh page token
      const pagesUrl = `${FB_GRAPH_BASE}/me/accounts?access_token=${page.fbUserAccessToken}`;
      const pagesResponse = await fetch(pagesUrl);
      const pagesData = await pagesResponse.json() as any;

      if (pagesData.data) {
        const fbPage = pagesData.data.find((p: any) => p.id === page.fbPageId);
        if (fbPage?.access_token) {
          // Update the page token
          await db.update(pages)
            .set({ fbPageAccessToken: fbPage.access_token })
            .where(eq(pages.id, pageId));

          return fbPage.access_token;
        }
      }
    }

    return null;
  } catch (error) {
    console.error('[Facebook OAuth] Token refresh failed:', error);
    return null;
  }
}

export default router;
