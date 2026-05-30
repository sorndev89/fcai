"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
// ──────────────────────────────────────────────
//  Mocks — use vi.hoisted to avoid hoisting issues
// ──────────────────────────────────────────────
const { mockSelect, mockFrom, mockWhere, mockLimit } = vitest_1.vi.hoisted(() => {
    const select = vitest_1.vi.fn();
    const from = vitest_1.vi.fn();
    const where = vitest_1.vi.fn();
    const limit = vitest_1.vi.fn();
    select.mockReturnValue({ from });
    from.mockReturnValue({ where });
    where.mockReturnValue({ limit });
    return { mockSelect: select, mockFrom: from, mockWhere: where, mockLimit: limit };
});
vitest_1.vi.mock('drizzle-orm', () => ({
    eq: (a, b) => ({ field: a, value: b }),
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
    db: { select: mockSelect },
}));
const { mockGenerateContent } = vitest_1.vi.hoisted(() => ({
    mockGenerateContent: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('@google/genai', () => ({
    GoogleGenAI: vitest_1.vi.fn().mockImplementation(() => ({
        models: { generateContent: mockGenerateContent },
    })),
}));
const { mockFetch } = vitest_1.vi.hoisted(() => ({
    mockFetch: vitest_1.vi.fn(),
}));
// ──────────────────────────────────────────────
//  Module under test
// ──────────────────────────────────────────────
const gemini_1 = require("../services/gemini");
(0, vitest_1.describe)('gemini.ts — AI Service', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        // Re-bind chain
        mockSelect.mockReturnValue({ from: mockFrom });
        mockFrom.mockReturnValue({ where: mockWhere });
        mockWhere.mockReturnValue({ limit: mockLimit });
    });
    // ────────────────────────────────────────
    //  1. getActiveAiConfig() active config resolution
    // ────────────────────────────────────────
    (0, vitest_1.describe)('getActiveAiConfig() — active config resolution', () => {
        (0, vitest_1.it)('should return placeholder response when no active config exists', async () => {
            mockLimit.mockResolvedValue([]);
            const result = await (0, gemini_1.generateAiResponse)('Hello', 'We sell coffee.', 'John', '', []);
            (0, vitest_1.expect)(result.text).toContain('ຍັງບໍ່ທັນໄດ້ຕັ້ງຄ່າ');
            (0, vitest_1.expect)(result.tokenCount).toBe(0);
            (0, vitest_1.expect)(mockSelect).toHaveBeenCalled();
        });
        (0, vitest_1.it)('should call Gemini provider when active config is Gemini', async () => {
            mockLimit.mockResolvedValue([
                {
                    id: 'cfg-1',
                    provider: 'gemini',
                    modelName: 'gemini-2.5-flash',
                    apiKey: 'AIza-test-key',
                    baseUrl: null,
                    isActive: true,
                },
            ]);
            mockGenerateContent.mockResolvedValue({
                text: 'Hello John! How can I help you today?',
                usageMetadata: { promptTokenCount: 45, candidatesTokenCount: 12 },
            });
            const result = await (0, gemini_1.generateAiResponse)('Hi there!', 'We sell coffee at $5 per cup.', 'John', 'VIP customer', [{ role: 'user', text: 'Previous message' }]);
            (0, vitest_1.expect)(result.text).toBe('Hello John! How can I help you today?');
            (0, vitest_1.expect)(result.tokenCount).toBe(57); // 45 + 12
            (0, vitest_1.expect)(mockGenerateContent).toHaveBeenCalled();
        });
        (0, vitest_1.it)('should route non-Gemini providers through OpenAI-compatible API', async () => {
            mockLimit.mockResolvedValue([
                {
                    id: 'cfg-2',
                    provider: 'openai',
                    modelName: 'gpt-4o',
                    apiKey: 'sk-test-key',
                    baseUrl: null,
                    isActive: true,
                },
            ]);
            global.fetch = mockFetch;
            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    choices: [{ message: { content: 'Sure, coffee is $5 per cup!' } }],
                    usage: { prompt_tokens: 50, completion_tokens: 10 },
                }),
            });
            const result = await (0, gemini_1.generateAiResponse)('How much is coffee?', 'Coffee is $5 per cup.', 'John', '', []);
            (0, vitest_1.expect)(result.text).toBe('Sure, coffee is $5 per cup!');
            (0, vitest_1.expect)(result.tokenCount).toBe(60); // 50 + 10
            (0, vitest_1.expect)(mockFetch).toHaveBeenCalledWith(vitest_1.expect.stringContaining('/chat/completions'), vitest_1.expect.objectContaining({
                method: 'POST',
                headers: vitest_1.expect.objectContaining({ Authorization: 'Bearer sk-test-key' }),
            }));
        });
        (0, vitest_1.it)('should use fallback token estimation when usage metadata is missing', async () => {
            mockLimit.mockResolvedValue([
                {
                    id: 'cfg-3',
                    provider: 'gemini',
                    modelName: 'gemini-2.5-flash',
                    apiKey: 'AIza-test-key',
                    baseUrl: null,
                    isActive: true,
                },
            ]);
            mockGenerateContent.mockResolvedValue({ text: 'A short reply.' });
            const result = await (0, gemini_1.generateAiResponse)('Hello', 'Coffee shop.', 'John', '', []);
            (0, vitest_1.expect)(result.tokenCount).toBeGreaterThanOrEqual(1);
            (0, vitest_1.expect)(result.text).toBe('A short reply.');
        });
    });
    // ────────────────────────────────────────
    //  2. generateAiResponse() — error recovery
    // ────────────────────────────────────────
    (0, vitest_1.describe)('generateAiResponse() — error recovery', () => {
        (0, vitest_1.it)('should return polite error message when AI provider call fails', async () => {
            mockLimit.mockResolvedValue([
                {
                    id: 'cfg-1',
                    provider: 'gemini',
                    modelName: 'gemini-2.5-flash',
                    apiKey: 'AIza-test-key',
                    baseUrl: null,
                    isActive: true,
                },
            ]);
            mockGenerateContent.mockRejectedValue(new Error('API rate limit exceeded'));
            const result = await (0, gemini_1.generateAiResponse)('Hello', 'Coffee shop.', 'John', '', []);
            (0, vitest_1.expect)(result.text).toContain('ຂໍອະໄພ');
            (0, vitest_1.expect)(result.tokenCount).toBe(0);
        });
        (0, vitest_1.it)('should return placeholder when apiKey is empty', async () => {
            mockLimit.mockResolvedValue([
                {
                    id: 'cfg-4',
                    provider: 'gemini',
                    modelName: 'gemini-2.5-flash',
                    apiKey: '',
                    baseUrl: null,
                    isActive: true,
                },
            ]);
            const result = await (0, gemini_1.generateAiResponse)('Hello', 'Coffee.', 'John', '', []);
            (0, vitest_1.expect)(result.text).toContain('ຍັງບໍ່ທັນໄດ້ຕັ້ງຄ່າ');
            (0, vitest_1.expect)(result.tokenCount).toBe(0);
        });
    });
    // ────────────────────────────────────────
    //  3. extractOrderSummary()
    // ────────────────────────────────────────
    (0, vitest_1.describe)('extractOrderSummary()', () => {
        (0, vitest_1.it)('should extract structured order data using Gemini', async () => {
            mockLimit.mockResolvedValue([
                {
                    id: 'cfg-1',
                    provider: 'gemini',
                    modelName: 'gemini-2.5-flash',
                    apiKey: 'AIza-test-key',
                    baseUrl: null,
                    isActive: true,
                },
            ]);
            mockGenerateContent.mockResolvedValue({
                text: JSON.stringify({
                    hasPurchase: true,
                    summary: {
                        customerName: 'John Doe',
                        phone: '020 12345678',
                        shippingAddress: 'Vientiane, Laos',
                        products: [
                            { name: 'Coffee', qty: 2, price: 50000 },
                            { name: 'Tea', qty: 1, price: 20000 },
                        ],
                        totalPrice: 120000,
                    },
                }),
            });
            const result = await (0, gemini_1.extractOrderSummary)('Chat logs content...');
            (0, vitest_1.expect)(result.success).toBe(true);
            (0, vitest_1.expect)(result.hasPurchase).toBe(true);
            (0, vitest_1.expect)(result.summary?.customerName).toBe('John Doe');
            (0, vitest_1.expect)(result.summary?.totalPrice).toBe(120000);
            (0, vitest_1.expect)(result.summary?.products).toHaveLength(2);
        });
        (0, vitest_1.it)('should handle non-Gemini provider for order extraction', async () => {
            mockLimit.mockResolvedValue([
                {
                    id: 'cfg-2',
                    provider: 'openai',
                    modelName: 'gpt-4o',
                    apiKey: 'sk-test-key',
                    baseUrl: 'https://api.openai.com/v1',
                    isActive: true,
                },
            ]);
            global.fetch = mockFetch;
            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    choices: [
                        {
                            message: {
                                content: JSON.stringify({ hasPurchase: false, summary: null }),
                            },
                        },
                    ],
                }),
            });
            const result = await (0, gemini_1.extractOrderSummary)('Just chatting...');
            (0, vitest_1.expect)(result.success).toBe(true);
            (0, vitest_1.expect)(result.hasPurchase).toBe(false);
            (0, vitest_1.expect)(result.summary).toBeNull();
        });
        (0, vitest_1.it)('should return mock data when no active config exists', async () => {
            mockLimit.mockResolvedValue([]);
            const result = await (0, gemini_1.extractOrderSummary)('Some chat logs');
            (0, vitest_1.expect)(result.success).toBe(true);
            (0, vitest_1.expect)(result.hasPurchase).toBe(true);
            (0, vitest_1.expect)(result.summary?.customerName).toBe('ສົມພອນ ສິລິວົງ');
        });
        (0, vitest_1.it)('should handle JSON parse errors gracefully', async () => {
            mockLimit.mockResolvedValue([
                {
                    id: 'cfg-1',
                    provider: 'gemini',
                    modelName: 'gemini-2.5-flash',
                    apiKey: 'AIza-test-key',
                    baseUrl: null,
                    isActive: true,
                },
            ]);
            mockGenerateContent.mockResolvedValue({ text: 'This is not valid JSON { broken' });
            const result = await (0, gemini_1.extractOrderSummary)('Chat logs...');
            (0, vitest_1.expect)(result.success).toBe(false);
            (0, vitest_1.expect)(result.hasPurchase).toBe(false);
            (0, vitest_1.expect)(result.summary).toBeNull();
        });
    });
    // ────────────────────────────────────────
    //  4. Token counting accuracy
    // ────────────────────────────────────────
    (0, vitest_1.describe)('Token counting accuracy', () => {
        (0, vitest_1.it)('should sum prompt+completion tokens from Gemini usageMetadata', async () => {
            mockLimit.mockResolvedValue([
                {
                    id: 'cfg-1',
                    provider: 'gemini',
                    modelName: 'gemini-2.5-flash',
                    apiKey: 'AIza-test-key',
                    baseUrl: null,
                    isActive: true,
                },
            ]);
            mockGenerateContent.mockResolvedValue({
                text: 'Response text',
                usageMetadata: { promptTokenCount: 150, candidatesTokenCount: 35 },
            });
            const result = await (0, gemini_1.generateAiResponse)('Test', 'KB', 'User', '', []);
            (0, vitest_1.expect)(result.tokenCount).toBe(185);
        });
        (0, vitest_1.it)('should sum prompt+completion tokens from OpenAI usage', async () => {
            mockLimit.mockResolvedValue([
                {
                    id: 'cfg-2',
                    provider: 'openai',
                    modelName: 'gpt-4o',
                    apiKey: 'sk-test-key',
                    baseUrl: 'https://api.openai.com/v1',
                    isActive: true,
                },
            ]);
            global.fetch = mockFetch;
            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    choices: [{ message: { content: 'Hi' } }],
                    usage: { prompt_tokens: 200, completion_tokens: 50 },
                }),
            });
            const result = await (0, gemini_1.generateAiResponse)('Hello', 'KB', 'User', '', []);
            (0, vitest_1.expect)(result.tokenCount).toBe(250);
        });
        (0, vitest_1.it)('should use fallback estimation when API returns no usage metadata', async () => {
            mockLimit.mockResolvedValue([
                {
                    id: 'cfg-1',
                    provider: 'gemini',
                    modelName: 'gemini-2.5-flash',
                    apiKey: 'AIza-test-key',
                    baseUrl: null,
                    isActive: true,
                },
            ]);
            mockGenerateContent.mockResolvedValue({ text: 'Hello! How can I assist you?' });
            const result = await (0, gemini_1.generateAiResponse)('Hi, I need help.', 'Coffee shop KB.', 'Test User', '', []);
            (0, vitest_1.expect)(result.tokenCount).toBeGreaterThan(0);
        });
    });
    // ────────────────────────────────────────
    //  5. Token Limit Enforcement — ⚠️ GAP
    // ────────────────────────────────────────
    (0, vitest_1.describe)('Token limit enforcement — ⚠️ GAP ANALYSIS', () => {
        (0, vitest_1.it)('should DEMONSTRATE that NO token limit check exists before AI generation', async () => {
            // This test proves generateAiResponse() does NOT accept or check
            // any token limits — it always generates a response.
            mockLimit.mockResolvedValue([
                {
                    id: 'cfg-1',
                    provider: 'gemini',
                    modelName: 'gemini-2.5-flash',
                    apiKey: 'AIza-test-key',
                    baseUrl: null,
                    isActive: true,
                },
            ]);
            mockGenerateContent.mockResolvedValue({
                text: 'Generated even without any limit check.',
                usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
            });
            const result = await (0, gemini_1.generateAiResponse)('Hello', 'Coffee shop.', 'John', '', []);
            // AI response always proceeds — no limit enforcement
            (0, vitest_1.expect)(result.text).toBe('Generated even without any limit check.');
            (0, vitest_1.expect)(result.tokenCount).toBe(15);
            // The function signature does not accept:
            //   - maxTokens (from user's package)
            //   - currentUsage (cumulative token consumption)
            //
            // The webhook also doesn't check before calling this function.
            // To fix: Add limit check in webhook.ts before calling generateAiResponse().
        });
    });
});
//# sourceMappingURL=gemini.test.js.map