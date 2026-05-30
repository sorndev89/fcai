"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
// ──────────────────────────────────────────────
//  Mocks — vi.hoisted to avoid hoisting issues
// ──────────────────────────────────────────────
const { mockDbChain, dbMock } = vitest_1.vi.hoisted(() => {
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
    return { mockDbChain: chain, dbMock: chain };
});
vitest_1.vi.mock('drizzle-orm', () => ({
    eq: (a, b) => ({ field: a, value: b }),
    and: (...args) => ({ type: 'and', conditions: args }),
    desc: (a) => ({ order: 'desc', field: a }),
    asc: (a) => ({ order: 'asc', field: a }),
    sql: (strings, ...values) => ({ type: 'sql', strings, values }),
    inArray: (a, b) => ({ type: 'inArray', field: a, values: b }),
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
const { mockRandomUUID } = vitest_1.vi.hoisted(() => ({
    mockRandomUUID: vitest_1.vi.fn(() => 'mock-uuid-12345'),
}));
vitest_1.vi.mock('crypto', () => ({
    default: { randomUUID: mockRandomUUID },
    randomUUID: mockRandomUUID,
}));
vitest_1.vi.mock('../config/db', () => ({
    db: dbMock,
}));
const { mockFetchUserProfile, mockSendTextMessage } = vitest_1.vi.hoisted(() => ({
    mockFetchUserProfile: vitest_1.vi.fn(),
    mockSendTextMessage: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('../services/facebook', () => ({
    fetchUserProfile: mockFetchUserProfile,
    sendTextMessage: mockSendTextMessage,
}));
const { mockGenerateAiResponse } = vitest_1.vi.hoisted(() => ({
    mockGenerateAiResponse: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('../services/gemini', () => ({
    generateAiResponse: mockGenerateAiResponse,
}));
// ──────────────────────────────────────────────
//  Module under test
// ──────────────────────────────────────────────
const webhook_1 = require("../routes/webhook");
(0, vitest_1.describe)('processIncomingMessage() — full flow', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        // Re-bind chain methods to return the chain
        Object.values(dbMock).forEach((fn) => {
            if (vitest_1.vi.isMockFunction(fn)) {
                fn.mockReturnValue(dbMock);
            }
        });
        dbMock.values.mockResolvedValue(undefined);
    });
    (0, vitest_1.it)('should return null when page is not found in database', async () => {
        dbMock.limit.mockResolvedValueOnce([]);
        const result = await (0, webhook_1.processIncomingMessage)('fb-page-123', 'psid-456', 'Hello');
        (0, vitest_1.expect)(result).toBeNull();
        (0, vitest_1.expect)(dbMock.select).toHaveBeenCalled();
        (0, vitest_1.expect)(dbMock.from).toHaveBeenCalled();
        (0, vitest_1.expect)(dbMock.where).toHaveBeenCalled();
    });
    (0, vitest_1.it)('should return null when page is inactive', async () => {
        dbMock.limit.mockResolvedValueOnce([
            {
                id: 'page-1',
                fbPageName: 'Test Page',
                fbPageId: 'fb-page-123',
                fbPageAccessToken: 'page-access-token',
                knowledgeBase: 'We sell coffee.',
                isActive: false,
                userId: 'user-1',
            },
        ]);
        const result = await (0, webhook_1.processIncomingMessage)('fb-page-123', 'psid-456', 'Hello');
        (0, vitest_1.expect)(result).toBeNull();
    });
    (0, vitest_1.it)('should create a new customer and process the full AI flow', async () => {
        // 1st query: Page lookup
        dbMock.limit.mockResolvedValueOnce([
            {
                id: 'page-1',
                fbPageName: 'My Coffee Shop',
                fbPageId: 'fb-page-123',
                fbPageAccessToken: 'EAAx...test-token',
                knowledgeBase: 'We sell premium Lao coffee.',
                isActive: true,
                userId: 'user-1',
            },
        ]);
        // 2nd query: Customer not found → new
        dbMock.limit.mockResolvedValueOnce([]);
        mockFetchUserProfile.mockResolvedValue({
            fullName: 'John Doe',
            firstName: 'John',
            lastName: 'Doe',
            profilePic: 'https://example.com/pic.jpg',
        });
        // 3rd query: Chat history empty
        dbMock.limit.mockResolvedValueOnce([]);
        mockGenerateAiResponse.mockResolvedValue({
            text: 'Welcome to My Coffee Shop, John! How can I assist you today?',
            tokenCount: 42,
        });
        mockSendTextMessage.mockResolvedValue(true);
        const result = await (0, webhook_1.processIncomingMessage)('fb-page-123', 'psid-456', 'Hello');
        (0, vitest_1.expect)(result).not.toBeNull();
        (0, vitest_1.expect)(result?.customerName).toBe('John Doe');
        (0, vitest_1.expect)(result?.reply).toBe('Welcome to My Coffee Shop, John! How can I assist you today?');
        (0, vitest_1.expect)(result?.sent).toBe(true);
        (0, vitest_1.expect)(dbMock.insert).toHaveBeenCalled();
        (0, vitest_1.expect)(dbMock.values).toHaveBeenCalled();
        // Verify AI called with correct params
        (0, vitest_1.expect)(mockGenerateAiResponse).toHaveBeenCalledWith('Hello', 'We sell premium Lao coffee.', 'John Doe', '', []);
        // Verify token count in chat log insert (2nd values call — 1st is customer insert)
        const valuesCall = dbMock.values.mock.calls[1][0];
        (0, vitest_1.expect)(valuesCall.tokenCount).toBe(42);
    });
    (0, vitest_1.it)('should use existing customer data for returning customers', async () => {
        dbMock.limit.mockResolvedValueOnce([
            {
                id: 'page-1',
                fbPageName: 'My Coffee Shop',
                fbPageId: 'fb-page-123',
                fbPageAccessToken: 'EAAx...test-token',
                knowledgeBase: 'We sell premium Lao coffee.',
                isActive: true,
                userId: 'user-1',
            },
        ]);
        dbMock.limit.mockResolvedValueOnce([
            {
                id: 'cust-1',
                fbPsid: 'psid-456',
                fullName: 'Existing Customer',
                firstName: 'Existing',
                notes: 'Prefers iced coffee',
            },
        ]);
        dbMock.limit.mockResolvedValueOnce([
            {
                id: 'log-1',
                messageIn: 'Do you have coffee?',
                messageOut: 'Yes, we have premium Lao coffee!',
                tokenCount: 30,
                createdAt: new Date('2025-01-01T10:00:00Z'),
            },
        ]);
        mockGenerateAiResponse.mockResolvedValue({
            text: 'Sure! One iced coffee coming right up.',
            tokenCount: 18,
        });
        mockSendTextMessage.mockResolvedValue(true);
        const result = await (0, webhook_1.processIncomingMessage)('fb-page-123', 'psid-456', 'I want an iced coffee');
        (0, vitest_1.expect)(result?.customerName).toBe('Existing Customer');
        (0, vitest_1.expect)(mockGenerateAiResponse).toHaveBeenCalledWith('I want an iced coffee', 'We sell premium Lao coffee.', 'Existing Customer', 'Prefers iced coffee', vitest_1.expect.arrayContaining([
            vitest_1.expect.objectContaining({ role: 'user', text: 'Do you have coffee?' }),
            vitest_1.expect.objectContaining({ role: 'model', text: 'Yes, we have premium Lao coffee!' }),
        ]));
    });
    (0, vitest_1.it)('should handle Facebook send failure gracefully', async () => {
        dbMock.limit.mockResolvedValueOnce([
            {
                id: 'page-1',
                fbPageName: 'Test Page',
                fbPageId: 'fb-page-123',
                fbPageAccessToken: 'tok',
                knowledgeBase: 'KB',
                isActive: true,
                userId: 'user-1',
            },
        ]);
        dbMock.limit.mockResolvedValueOnce([
            { id: 'cust-1', fbPsid: 'psid-456', fullName: 'Test User', notes: '' },
        ]);
        dbMock.limit.mockResolvedValueOnce([]);
        mockGenerateAiResponse.mockResolvedValue({ text: 'Hello!', tokenCount: 10 });
        mockSendTextMessage.mockResolvedValue(false);
        const result = await (0, webhook_1.processIncomingMessage)('fb-page-123', 'psid-456', 'Hi');
        (0, vitest_1.expect)(result?.sent).toBe(false);
        (0, vitest_1.expect)(dbMock.values).toHaveBeenCalled(); // Still logged
    });
});
(0, vitest_1.describe)('Token tracking verification', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        Object.values(dbMock).forEach((fn) => {
            if (vitest_1.vi.isMockFunction(fn))
                fn.mockReturnValue(dbMock);
        });
        dbMock.values.mockResolvedValue(undefined);
    });
    (0, vitest_1.it)('should store tokenCount in chat_logs after AI response', async () => {
        dbMock.limit.mockResolvedValueOnce([
            { id: 'page-1', fbPageName: 'Test', fbPageId: '1', fbPageAccessToken: 'tok', knowledgeBase: 'KB', isActive: true, userId: 'user-1' },
        ]);
        dbMock.limit.mockResolvedValueOnce([
            { id: 'cust-1', fbPsid: 'psid', fullName: 'User', notes: '' },
        ]);
        dbMock.limit.mockResolvedValueOnce([]);
        mockGenerateAiResponse.mockResolvedValue({ text: 'Test response', tokenCount: 128 });
        mockSendTextMessage.mockResolvedValue(true);
        await (0, webhook_1.processIncomingMessage)('1', 'psid', 'Test message');
        const valuesCall = dbMock.values.mock.calls[0][0];
        (0, vitest_1.expect)(valuesCall).toMatchObject({
            messageIn: 'Test message',
            messageOut: 'Test response',
            tokenCount: 128,
        });
    });
});
(0, vitest_1.describe)('⚠️ Token limit enforcement — GAP ANALYSIS', () => {
    (0, vitest_1.it)('should document that NO token limit check exists before AI generation', async () => {
        // Current processIncomingMessage() performs these steps:
        //   1. Page lookup
        //   2. Customer lookup/creation
        //   3. Chat history retrieval
        //   4. → AI response (NO limit check)
        //   5. Send to Facebook
        //   6. Log conversation
        //
        // There is NO step between #3 and #4 that:
        //   - Queries the user's cumulative token usage
        //   - Compares it against the user's package maxTokens
        //   - Blocks the AI call if exceeded
        //
        // Required fix: Add limit check in processIncomingMessage():
        //   const userPkg = await db.select().from(users)
        //     .where(eq(users.id, page.userId)).limit(1);
        //   if (userPkg[0]?.packageId) {
        //     const pkg = await db.select().from(packages)
        //       .where(eq(packages.id, userPkg[0].packageId)).limit(1);
        //     const usage = await db.select({ total: sql`SUM(tokenCount)` })
        //       .from(chatLogs).innerJoin(pages, eq(chatLogs.pageId, pages.id))
        //       .where(eq(pages.userId, page.userId));
        //     if (usage[0]?.total >= pkg[0]?.maxTokens) {
        //       return { customerName, reply: 'Limit reached', sent: false };
        //     }
        //   }
        (0, vitest_1.expect)(true).toBe(true);
    });
});
//# sourceMappingURL=webhook.test.js.map