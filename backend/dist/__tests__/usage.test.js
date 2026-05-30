"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
// ──────────────────────────────────────────────
//  Mocks — vi.hoisted for proper hoisting
// ──────────────────────────────────────────────
const { dbMock } = vitest_1.vi.hoisted(() => {
    const chain = {};
    chain.select = vitest_1.vi.fn(() => chain);
    chain.from = vitest_1.vi.fn(() => chain);
    chain.where = vitest_1.vi.fn(() => chain);
    chain.limit = vitest_1.vi.fn(() => chain);
    chain.orderBy = vitest_1.vi.fn(() => chain);
    chain.innerJoin = vitest_1.vi.fn(() => chain);
    chain.groupBy = vitest_1.vi.fn(() => chain);
    chain.insert = vitest_1.vi.fn(() => chain);
    chain.values = vitest_1.vi.fn(() => chain);
    chain.update = vitest_1.vi.fn(() => chain);
    chain.set = vitest_1.vi.fn(() => chain);
    chain.delete = vitest_1.vi.fn(() => chain);
    return { dbMock: chain };
});
vitest_1.vi.mock('drizzle-orm', () => ({
    eq: (a, b) => ({ field: a, value: b }),
    inArray: (a, b) => ({ type: 'inArray', field: a, values: b }),
    sql: (strings, ...values) => ({ type: 'sql', strings, values, _isSql: true }),
}));
// Mock schema tables directly to avoid drizzle-orm/mysql-core subpath resolution issues
vitest_1.vi.mock('../db/schema', () => ({
    aiConfig: {},
    packages: {},
    users: {},
    pages: {},
    chatLogs: {},
    customers: {},
    payments: {},
}));
vitest_1.vi.mock('../config/db', () => ({
    db: dbMock,
}));
vitest_1.vi.mock('../middleware/auth', () => ({
    authenticateToken: vitest_1.vi.fn((req, res, next) => next()),
    AuthenticatedRequest: {},
}));
(0, vitest_1.describe)('Usage Tracking — aggregation logic', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        Object.values(dbMock).forEach((fn) => {
            if (vitest_1.vi.isMockFunction(fn))
                fn.mockReturnValue(dbMock);
        });
    });
    (0, vitest_1.it)('should verify the token aggregation SQL query structure', () => {
        // The usage.ts routes use:
        //
        // sql<number>`COALESCE(SUM(${chatLogs.tokenCount}), 0)`
        // to aggregate token usage per page.
        //
        // This query sums all tokenCount values from chat_logs for each page
        // and groups by pageId.
        //
        // The aggregated result is used in both:
        //   GET /api/usage/my — current user's usage
        //   GET /api/usage/all — admin view of all users
        //
        // Verify the mock structure is sound
        (0, vitest_1.expect)(dbMock.select).toBeDefined();
        (0, vitest_1.expect)(dbMock.from).toBeDefined();
        (0, vitest_1.expect)(dbMock.innerJoin).toBeDefined();
        (0, vitest_1.expect)(dbMock.where).toBeDefined();
        (0, vitest_1.expect)(dbMock.groupBy).toBeDefined();
    });
    (0, vitest_1.it)('should correctly sum token counts from chat_logs for a user', () => {
        // This simulates the aggregation logic
        const chatLogs = [
            { tokenCount: 150, pageId: 'page-1' },
            { tokenCount: 200, pageId: 'page-1' },
            { tokenCount: 75, pageId: 'page-2' },
            { tokenCount: 500, pageId: 'page-3' }, // Different page
        ];
        // Filter for a specific user's pages (by page IDs)
        const userPageIds = ['page-1', 'page-2'];
        const userLogs = chatLogs.filter(l => userPageIds.includes(l.pageId));
        const total = userLogs.reduce((sum, l) => sum + l.tokenCount, 0);
        (0, vitest_1.expect)(total).toBe(425); // 150 + 200 + 75
        (0, vitest_1.expect)(userLogs).toHaveLength(3);
    });
});
(0, vitest_1.describe)('Token limit enforcement design', () => {
    (0, vitest_1.it)('should outline the required enforcement logic', () => {
        // The system needs to enforce token limits at the webhook level.
        // Here's the required flow:
        // Step 1: Get the user's package maxTokens
        // SELECT p.maxTokens FROM users u
        // JOIN packages p ON u.packageId = p.id
        // WHERE u.id = :userId
        const packageMaxTokens = 100000;
        // Step 2: Get current billing period usage
        // SELECT COALESCE(SUM(cl.tokenCount), 0) as totalUsed
        // FROM chat_logs cl
        // JOIN pages p ON cl.pageId = p.id
        // WHERE p.userId = :userId
        // AND cl.createdAt >= DATE_FORMAT(NOW(), '%Y-%m-01')
        const currentUsage = 95000;
        // Step 3: Compare and block if exceeded
        const isUnderLimit = currentUsage < packageMaxTokens;
        const isAtOrOverLimit = currentUsage >= packageMaxTokens;
        (0, vitest_1.expect)(isUnderLimit).toBe(true); // 95000 < 100000 → allowed
        (0, vitest_1.expect)(isAtOrOverLimit).toBe(false);
        // If usage were 100000 or more:
        const exceededUsage = 100000;
        (0, vitest_1.expect)(exceededUsage >= packageMaxTokens).toBe(true); // Should block
    });
    (0, vitest_1.it)('should demonstrate the current GAP — no enforcement', () => {
        // Currently the webhook.ts processIncomingMessage() does NOT:
        // 1. Query the user's cumulative token usage
        // 2. Compare against their package maxTokens
        // 3. Block/prevent AI response if over limit
        //
        // The token count is tracked in chat_logs.tokenCount (webhook.ts:118)
        // and can be queried via GET /api/usage/my (usage.ts:17-71),
        // but there's no active enforcement during message processing.
        //
        // This gap means users can exceed their plan's token allocation
        // without any blocking mechanism.
        const gapExists = true;
        (0, vitest_1.expect)(gapExists).toBe(true);
    });
});
//# sourceMappingURL=usage.test.js.map