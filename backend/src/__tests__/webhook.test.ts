import { describe, it, expect, vi, beforeEach } from 'vitest';

// ──────────────────────────────────────────────
//  Mocks — vi.hoisted to avoid hoisting issues
// ──────────────────────────────────────────────

const { mockDbChain, dbMock } = vi.hoisted(() => {
  const chain: any = {};
  chain.select = vi.fn(() => chain);
  chain.from = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.orderBy = vi.fn(() => chain);
  chain.innerJoin = vi.fn(() => chain);
  chain.groupBy = vi.fn(() => chain);
  chain.insert = vi.fn(() => chain);
  chain.values = vi.fn(() => chain);
  return { mockDbChain: chain, dbMock: chain };
});

vi.mock('drizzle-orm', () => ({
  eq: (a: any, b: any) => ({ field: a, value: b }),
  and: (...args: any[]) => ({ type: 'and', conditions: args }),
  desc: (a: any) => ({ order: 'desc', field: a }),
  asc: (a: any) => ({ order: 'asc', field: a }),
  sql: (strings: any, ...values: any[]) => ({ type: 'sql', strings, values }),
  inArray: (a: any, b: any) => ({ type: 'inArray', field: a, values: b }),
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

const { mockRandomUUID } = vi.hoisted(() => ({
  mockRandomUUID: vi.fn(() => 'mock-uuid-12345'),
}));

vi.mock('crypto', () => ({
  default: { randomUUID: mockRandomUUID },
  randomUUID: mockRandomUUID,
}));

vi.mock('../config/db', () => ({
  db: dbMock,
}));

const { mockFetchUserProfile, mockSendTextMessage } = vi.hoisted(() => ({
  mockFetchUserProfile: vi.fn(),
  mockSendTextMessage: vi.fn(),
}));

vi.mock('../services/facebook', () => ({
  fetchUserProfile: mockFetchUserProfile,
  sendTextMessage: mockSendTextMessage,
}));

const { mockGenerateAiResponse } = vi.hoisted(() => ({
  mockGenerateAiResponse: vi.fn(),
}));

vi.mock('../services/gemini', () => ({
  generateAiResponse: mockGenerateAiResponse,
}));

// ──────────────────────────────────────────────
//  Module under test
// ──────────────────────────────────────────────
import { processIncomingMessage } from '../routes/webhook';

describe('processIncomingMessage() — full flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-bind chain methods to return the chain
    Object.values(dbMock).forEach((fn: any) => {
      if (vi.isMockFunction(fn)) {
        fn.mockReturnValue(dbMock);
      }
    });
    dbMock.values.mockResolvedValue(undefined);
  });

  it('should return null when page is not found in database', async () => {
    dbMock.limit.mockResolvedValueOnce([]);

    const result = await processIncomingMessage('fb-page-123', 'psid-456', 'Hello');

    expect(result).toBeNull();
    expect(dbMock.select).toHaveBeenCalled();
    expect(dbMock.from).toHaveBeenCalled();
    expect(dbMock.where).toHaveBeenCalled();
  });

  it('should return null when page is inactive', async () => {
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

    const result = await processIncomingMessage('fb-page-123', 'psid-456', 'Hello');

    expect(result).toBeNull();
  });

  it('should create a new customer and process the full AI flow', async () => {
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

    const result = await processIncomingMessage('fb-page-123', 'psid-456', 'Hello');

    expect(result).not.toBeNull();
    expect(result?.customerName).toBe('John Doe');
    expect(result?.reply).toBe('Welcome to My Coffee Shop, John! How can I assist you today?');
    expect(result?.sent).toBe(true);
    expect(dbMock.insert).toHaveBeenCalled();
    expect(dbMock.values).toHaveBeenCalled();

    // Verify AI called with correct params
    expect(mockGenerateAiResponse).toHaveBeenCalledWith(
      'Hello',
      'We sell premium Lao coffee.',
      'John Doe',
      '',
      []
    );

    // Verify token count in chat log insert (2nd values call — 1st is customer insert)
    const valuesCall = dbMock.values.mock.calls[1][0];
    expect(valuesCall.tokenCount).toBe(42);
  });

  it('should use existing customer data for returning customers', async () => {
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

    const result = await processIncomingMessage('fb-page-123', 'psid-456', 'I want an iced coffee');

    expect(result?.customerName).toBe('Existing Customer');
    expect(mockGenerateAiResponse).toHaveBeenCalledWith(
      'I want an iced coffee',
      'We sell premium Lao coffee.',
      'Existing Customer',
      'Prefers iced coffee',
      expect.arrayContaining([
        expect.objectContaining({ role: 'user', text: 'Do you have coffee?' }),
        expect.objectContaining({ role: 'model', text: 'Yes, we have premium Lao coffee!' }),
      ])
    );
  });

  it('should handle Facebook send failure gracefully', async () => {
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

    const result = await processIncomingMessage('fb-page-123', 'psid-456', 'Hi');

    expect(result?.sent).toBe(false);
    expect(dbMock.values).toHaveBeenCalled(); // Still logged
  });
});

describe('Token tracking verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(dbMock).forEach((fn: any) => {
      if (vi.isMockFunction(fn)) fn.mockReturnValue(dbMock);
    });
    dbMock.values.mockResolvedValue(undefined);
  });

  it('should store tokenCount in chat_logs after AI response', async () => {
    dbMock.limit.mockResolvedValueOnce([
      { id: 'page-1', fbPageName: 'Test', fbPageId: '1', fbPageAccessToken: 'tok', knowledgeBase: 'KB', isActive: true, userId: 'user-1' },
    ]);
    dbMock.limit.mockResolvedValueOnce([
      { id: 'cust-1', fbPsid: 'psid', fullName: 'User', notes: '' },
    ]);
    dbMock.limit.mockResolvedValueOnce([]);

    mockGenerateAiResponse.mockResolvedValue({ text: 'Test response', tokenCount: 128 });
    mockSendTextMessage.mockResolvedValue(true);

    await processIncomingMessage('1', 'psid', 'Test message');

    const valuesCall = dbMock.values.mock.calls[0][0];
    expect(valuesCall).toMatchObject({
      messageIn: 'Test message',
      messageOut: 'Test response',
      tokenCount: 128,
    });
  });
});

describe('⚠️ Token limit enforcement — GAP ANALYSIS', () => {
  it('should document that NO token limit check exists before AI generation', async () => {
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

    expect(true).toBe(true);
  });
});
