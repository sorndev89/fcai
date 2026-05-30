import { describe, it, expect, vi, beforeEach } from 'vitest';

// ──────────────────────────────────────────────
//  Mocks — use vi.hoisted to avoid hoisting issues
// ──────────────────────────────────────────────

const { mockSelect, mockFrom, mockWhere, mockLimit } = vi.hoisted(() => {
  const select = vi.fn();
  const from = vi.fn();
  const where = vi.fn();
  const limit = vi.fn();
  select.mockReturnValue({ from });
  from.mockReturnValue({ where });
  where.mockReturnValue({ limit });
  return { mockSelect: select, mockFrom: from, mockWhere: where, mockLimit: limit };
});

vi.mock('drizzle-orm', () => ({
  eq: (a: any, b: any) => ({ field: a, value: b }),
}));

// Mock schema tables directly to avoid drizzle-orm/mysql-core subpath resolution issues
vi.mock('../db/schema', () => ({
  aiConfig: {},
  packages: {},
  users: {},
  pages: {},
  chatLogs: {},
  customers: {},
  payments: {},
}));

vi.mock('../config/db', () => ({
  db: { select: mockSelect },
}));

const { mockGenerateContent } = vi.hoisted(() => ({
  mockGenerateContent: vi.fn(),
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: { generateContent: mockGenerateContent },
  })),
}));

const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
}));

// ──────────────────────────────────────────────
//  Module under test
// ──────────────────────────────────────────────
import { generateAiResponse, extractOrderSummary } from '../services/gemini';

describe('gemini.ts — AI Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-bind chain
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ limit: mockLimit });
  });

  // ────────────────────────────────────────
  //  1. getActiveAiConfig() active config resolution
  // ────────────────────────────────────────
  describe('getActiveAiConfig() — active config resolution', () => {
    it('should return placeholder response when no active config exists', async () => {
      mockLimit.mockResolvedValue([]);

      const result = await generateAiResponse('Hello', 'We sell coffee.', 'John', '', []);

      expect(result.text).toContain('ຍັງບໍ່ທັນໄດ້ຕັ້ງຄ່າ');
      expect(result.tokenCount).toBe(0);
      expect(mockSelect).toHaveBeenCalled();
    });

    it('should call Gemini provider when active config is Gemini', async () => {
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

      const result = await generateAiResponse(
        'Hi there!',
        'We sell coffee at $5 per cup.',
        'John',
        'VIP customer',
        [{ role: 'user', text: 'Previous message' }]
      );

      expect(result.text).toBe('Hello John! How can I help you today?');
      expect(result.tokenCount).toBe(57); // 45 + 12
      expect(mockGenerateContent).toHaveBeenCalled();
    });

    it('should route non-Gemini providers through OpenAI-compatible API', async () => {
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

      (global as any).fetch = mockFetch;
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Sure, coffee is $5 per cup!' } }],
          usage: { prompt_tokens: 50, completion_tokens: 10 },
        }),
      });

      const result = await generateAiResponse('How much is coffee?', 'Coffee is $5 per cup.', 'John', '', []);

      expect(result.text).toBe('Sure, coffee is $5 per cup!');
      expect(result.tokenCount).toBe(60); // 50 + 10
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/chat/completions'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer sk-test-key' }),
        })
      );
    });

    it('should use fallback token estimation when usage metadata is missing', async () => {
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

      const result = await generateAiResponse('Hello', 'Coffee shop.', 'John', '', []);

      expect(result.tokenCount).toBeGreaterThanOrEqual(1);
      expect(result.text).toBe('A short reply.');
    });
  });

  // ────────────────────────────────────────
  //  2. generateAiResponse() — error recovery
  // ────────────────────────────────────────
  describe('generateAiResponse() — error recovery', () => {
    it('should return polite error message when AI provider call fails', async () => {
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

      const result = await generateAiResponse('Hello', 'Coffee shop.', 'John', '', []);

      expect(result.text).toContain('ຂໍອະໄພ');
      expect(result.tokenCount).toBe(0);
    });

    it('should return placeholder when apiKey is empty', async () => {
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

      const result = await generateAiResponse('Hello', 'Coffee.', 'John', '', []);

      expect(result.text).toContain('ຍັງບໍ່ທັນໄດ້ຕັ້ງຄ່າ');
      expect(result.tokenCount).toBe(0);
    });
  });

  // ────────────────────────────────────────
  //  3. extractOrderSummary()
  // ────────────────────────────────────────
  describe('extractOrderSummary()', () => {
    it('should extract structured order data using Gemini', async () => {
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

      const result = await extractOrderSummary('Chat logs content...');

      expect(result.success).toBe(true);
      expect(result.hasPurchase).toBe(true);
      expect(result.summary?.customerName).toBe('John Doe');
      expect(result.summary?.totalPrice).toBe(120000);
      expect(result.summary?.products).toHaveLength(2);
    });

    it('should handle non-Gemini provider for order extraction', async () => {
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

      (global as any).fetch = mockFetch;
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

      const result = await extractOrderSummary('Just chatting...');

      expect(result.success).toBe(true);
      expect(result.hasPurchase).toBe(false);
      expect(result.summary).toBeNull();
    });

    it('should return mock data when no active config exists', async () => {
      mockLimit.mockResolvedValue([]);

      const result = await extractOrderSummary('Some chat logs');

      expect(result.success).toBe(true);
      expect(result.hasPurchase).toBe(true);
      expect(result.summary?.customerName).toBe('ສົມພອນ ສິລິວົງ');
    });

    it('should handle JSON parse errors gracefully', async () => {
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

      const result = await extractOrderSummary('Chat logs...');

      expect(result.success).toBe(false);
      expect(result.hasPurchase).toBe(false);
      expect(result.summary).toBeNull();
    });
  });

  // ────────────────────────────────────────
  //  4. Token counting accuracy
  // ────────────────────────────────────────
  describe('Token counting accuracy', () => {
    it('should sum prompt+completion tokens from Gemini usageMetadata', async () => {
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

      const result = await generateAiResponse('Test', 'KB', 'User', '', []);
      expect(result.tokenCount).toBe(185);
    });

    it('should sum prompt+completion tokens from OpenAI usage', async () => {
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

      (global as any).fetch = mockFetch;
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Hi' } }],
          usage: { prompt_tokens: 200, completion_tokens: 50 },
        }),
      });

      const result = await generateAiResponse('Hello', 'KB', 'User', '', []);
      expect(result.tokenCount).toBe(250);
    });

    it('should use fallback estimation when API returns no usage metadata', async () => {
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

      const result = await generateAiResponse('Hi, I need help.', 'Coffee shop KB.', 'Test User', '', []);

      expect(result.tokenCount).toBeGreaterThan(0);
    });
  });

  // ────────────────────────────────────────
  //  5. Token Limit Enforcement — ⚠️ GAP
  // ────────────────────────────────────────
  describe('Token limit enforcement — ⚠️ GAP ANALYSIS', () => {
    it('should DEMONSTRATE that NO token limit check exists before AI generation', async () => {
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

      const result = await generateAiResponse('Hello', 'Coffee shop.', 'John', '', []);

      // AI response always proceeds — no limit enforcement
      expect(result.text).toBe('Generated even without any limit check.');
      expect(result.tokenCount).toBe(15);

      // The function signature does not accept:
      //   - maxTokens (from user's package)
      //   - currentUsage (cumulative token consumption)
      //
      // The webhook also doesn't check before calling this function.
      // To fix: Add limit check in webhook.ts before calling generateAiResponse().
    });
  });
});
