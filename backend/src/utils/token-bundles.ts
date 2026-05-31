import { db, poolConnection } from '../config/db';
import { tokenBundles } from '../db/schema';
import { asc, eq } from 'drizzle-orm';

const DEFAULT_BUNDLES = [
  { id: 'tok-25k', name: '25,000 Tokens', tokenAmount: 25000, price: 50000, sortOrder: 1, isActive: true },
  { id: 'tok-50k', name: '50,000 Tokens', tokenAmount: 50000, price: 90000, sortOrder: 2, isActive: true },
  { id: 'tok-100k', name: '100,000 Tokens', tokenAmount: 100000, price: 160000, sortOrder: 3, isActive: true },
] as const;

let ensurePromise: Promise<void> | null = null;

async function ensureTokenBundlesTableExists() {
  await poolConnection.execute(`
    CREATE TABLE IF NOT EXISTS \`token_bundles\` (
      \`id\` varchar(36) NOT NULL,
      \`name\` varchar(255) NOT NULL,
      \`token_amount\` int NOT NULL,
      \`price\` decimal(12,2) NOT NULL DEFAULT '0.00',
      \`sort_order\` int NOT NULL DEFAULT 0,
      \`is_active\` boolean DEFAULT true,
      \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`token_bundles_token_amount_unique\` (\`token_amount\`)
    )
  `);

  for (const bundle of DEFAULT_BUNDLES) {
    await poolConnection.execute(
      `
      INSERT IGNORE INTO \`token_bundles\`
        (\`id\`, \`name\`, \`token_amount\`, \`price\`, \`sort_order\`, \`is_active\`)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [bundle.id, bundle.name, bundle.tokenAmount, bundle.price, bundle.sortOrder, bundle.isActive]
    );
  }
}

export async function ensureTokenBundlesReady() {
  if (!ensurePromise) {
    ensurePromise = ensureTokenBundlesTableExists().catch((err) => {
      ensurePromise = null;
      throw err;
    });
  }

  return ensurePromise;
}

export async function getActiveTokenBundles() {
  try {
    await ensureTokenBundlesReady();
    return await db
      .select()
      .from(tokenBundles)
      .where(eq(tokenBundles.isActive, true))
      .orderBy(asc(tokenBundles.sortOrder), asc(tokenBundles.price));
  } catch (error: any) {
    console.warn('Token bundle query fallback:', error?.code || error?.message || error);
    return DEFAULT_BUNDLES;
  }
}

export async function getAllTokenBundles() {
  try {
    await ensureTokenBundlesReady();
    return await db
      .select()
      .from(tokenBundles)
      .orderBy(asc(tokenBundles.sortOrder), asc(tokenBundles.price));
  } catch (error: any) {
    console.warn('Token bundle query fallback:', error?.code || error?.message || error);
    return [...DEFAULT_BUNDLES];
  }
}
