import { GoogleGenAI } from '@google/genai';
import { db } from '../config/db';
import { aiConfig } from '../db/schema';
import { eq } from 'drizzle-orm';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

interface AiProviderConfig {
  provider: string;
  modelName: string;
  apiKey: string;
  baseUrl?: string | null;
}

/**
 * Fetches the currently active AI configuration from the database.
 * Returns null if no active config exists.
 */
async function getActiveAiConfig(): Promise<AiProviderConfig | null> {
  try {
    const configs = await db.select().from(aiConfig).where(eq(aiConfig.isActive, true)).limit(1);
    if (configs.length === 0) return null;
    const c = configs[0];
    return {
      provider: c.provider || 'gemini',
      modelName: c.modelName || 'gemini-2.5-flash',
      apiKey: c.apiKey,
      baseUrl: c.baseUrl,
    };
  } catch (err) {
    console.error('[AI Service] Failed to fetch active AI config:', err);
    return null;
  }
}

// ──────────────────────────────────────────────
//  OpenAI-compatible Chat Completion via fetch
// ──────────────────────────────────────────────
async function callOpenAiCompatible(
  config: AiProviderConfig,
  systemInstruction: string,
  messages: ChatMessage[],
  userMessage: string,
  temperature = 0.1
): Promise<{ text: string; promptTokens: number; completionTokens: number }> {
  const baseUrl = (config.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const url = `${baseUrl}/chat/completions`;

  const formattedMessages: any[] = [{ role: 'system', content: systemInstruction }];

  for (const msg of messages) {
    formattedMessages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.text,
    });
  }

  formattedMessages.push({ role: 'user', content: userMessage });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.modelName,
      messages: formattedMessages,
      temperature,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`OpenAI-compatible API error (${response.status}): ${errBody}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  const usage = data.usage || {};
  return {
    text,
    promptTokens: usage.prompt_tokens || 0,
    completionTokens: usage.completion_tokens || 0,
  };
}

// ──────────────────────────────────────────────
//  Gemini via Google GenAI SDK
// ──────────────────────────────────────────────
async function callGemini(
  config: AiProviderConfig,
  systemInstruction: string,
  prompt: string,
  temperature = 0.1
): Promise<{ text: string; promptTokens: number; completionTokens: number }> {
  const ai = new GoogleGenAI({ apiKey: config.apiKey });

  const response = await ai.models.generateContent({
    model: config.modelName,
    contents: prompt,
    config: {
      systemInstruction,
      temperature,
    },
  });

  const reply = response.text || '';
  let promptTokens = 0;
  let completionTokens = 0;

  if (response.usageMetadata) {
    promptTokens = response.usageMetadata.promptTokenCount || 0;
    completionTokens = response.usageMetadata.candidatesTokenCount || 0;
  } else {
    promptTokens = Math.ceil(prompt.length / 4);
    completionTokens = Math.ceil(reply.length / 4);
  }

  return { text: reply, promptTokens, completionTokens };
}

// ──────────────────────────────────────────────
//  Route the call to the correct provider
// ──────────────────────────────────────────────
async function callAiProvider(
  config: AiProviderConfig,
  systemInstruction: string,
  messages: ChatMessage[],
  userMessage: string,
  temperature = 0.1
): Promise<{ text: string; promptTokens: number; completionTokens: number }> {
  const provider = config.provider?.toLowerCase() || 'gemini';

  // Build prompt for Gemini (which doesn't natively support message arrays in the same way)
  const formattedHistory = messages
    .map((msg) => `${msg.role === 'user' ? 'Customer' : 'AI'}: ${msg.text}`)
    .join('\n');

  const prompt = `
=== RECENT CONVERSATION HISTORY ===
${formattedHistory || 'No previous messages.'}

=== NEW CUSTOMER MESSAGE ===
Customer: ${userMessage}

Provide your response below:
`;

  if (provider === 'gemini') {
    return callGemini(config, systemInstruction, prompt, temperature);
  }

  // All other providers use OpenAI-compatible chat completions API
  return callOpenAiCompatible(config, systemInstruction, messages, userMessage, temperature);
}

/**
 * Generates an intelligent AI response using the active AI configuration
 * (Gemini, OpenAI, OpenRouter, DeepSeek, etc.) strictly based on the
 * provided knowledge base.
 * Returns the response text along with estimated token count.
 */
export async function generateAiResponse(
  incomingMessage: string,
  knowledgeBase: string,
  customerName: string,
  customerNotes: string,
  chatHistory: ChatMessage[]
): Promise<{ text: string; tokenCount: number }> {
  const config = await getActiveAiConfig();

  if (!config || !config.apiKey) {
    console.warn('[AI Service] No active AI configuration found. Returning placeholder response.');
    return {
      text: `ສະບາຍດີທ່ານ ${customerName}! (ຂໍອະໄພ, ລະບົບ AI ຍັງບໍ່ທັນໄດ້ຕັ້ງຄ່າ. ກະລຸນາຕິດຕໍ່ຜູ້ດູແລລະບົບ).`,
      tokenCount: 0,
    };
  }

  // System Instructions to guide the model behavior
  const systemInstruction = `
You are an intelligent customer service AI assistant for a business page.
Your job is to answer customer questions politely, naturally, and professionally.

CRITICAL INSTRUCTIONS:
1. Answer the customer's inquiries strictly using the information provided in the "KNOWLEDGE BASE" below.
2. If the answer cannot be found in the "KNOWLEDGE BASE", politely inform the customer that you do not have that information or that a human representative will get back to them soon.
3. DO NOT hallucinate, assume, or invent details. If it's not in the knowledge base, do not guess.
4. Always address the customer politely by their name: "${customerName}".
5. Match the language of the customer's message (e.g., if they ask in Lao, answer in Lao. If they ask in English, answer in English).

=== BUSINESS KNOWLEDGE BASE ===
${knowledgeBase || 'No specific knowledge base content provided.'}

=== CUSTOMER PROFILE ===
Name: ${customerName}
Special Notes about this Customer: ${customerNotes || 'None'}
`;

  try {
    console.log(`[AI Service] Generating response via "${config.provider}/${config.modelName}" for customer "${customerName}"...`);

    const result = await callAiProvider(config, systemInstruction, chatHistory, incomingMessage, 0.1);

    const totalTokens = result.promptTokens + result.completionTokens;
    return { text: result.text.trim(), tokenCount: totalTokens };
  } catch (error) {
    console.error(`[AI Service] Error generating content via ${config.provider}:`, error);
    return {
      text: `ຂໍອະໄພ, ລະບົບກຳລັງມີປັນຫາດ້ານເຕັກນິກ. ພະນັກງານຈະຕິດຕໍ່ຫາທ່ານໂດຍໄວ.`,
      tokenCount: 0,
    };
  }
}

/**
 * Uses the active AI provider to parse a chat history log and extract
 * structured order/billing details.
 */
export async function extractOrderSummary(
  chatLogsText: string
): Promise<{
  success: boolean;
  hasPurchase: boolean;
  summary: {
    customerName: string;
    phone: string;
    shippingAddress: string;
    products: Array<{ name: string; qty: number; price: number }>;
    totalPrice: number;
  } | null;
}> {
  const config = await getActiveAiConfig();

  if (!config || !config.apiKey) {
    console.warn('[AI Service] No active AI configuration found. Returning mock summary.');
    return {
      success: true,
      hasPurchase: true,
      summary: {
        customerName: 'ສົມພອນ ສິລິວົງ',
        phone: '020 77889900',
        shippingAddress: 'ບ້ານສີຫອມ, ເມືອງຈັນທະບູລີ, ນະຄອນຫຼວງວຽງຈັນ',
        products: [
          { name: 'ແຢມສະຕໍເບີຣີອໍແກນິກ', qty: 2, price: 45000 },
          { name: 'ເຂົ້າຈີ່ຝຣັ່ງ', qty: 1, price: 20000 },
        ],
        totalPrice: 110000,
      },
    };
  }

  try {
    const prompt = `
Analyze the following chronological chat logs between a customer and a shop representative.
Your task is to identify if the customer bought or ordered any products, and extract the delivery details and structured order invoice information.

=== CHAT LOGS HISTORY ===
${chatLogsText}

Return a structured JSON with:
1. "hasPurchase": boolean, set true if customer confirmed buying products, false otherwise.
2. "summary": object containing:
   - "customerName": string, recipient's name if mentioned for delivery.
   - "phone": string, delivery phone number.
   - "shippingAddress": string, complete delivery address.
   - "products": array of objects with "name" (product name), "qty" (quantity, default 1), "price" (unit price in LAK/Kip if mentioned).
   - "totalPrice": number, calculated total sum of the products in LAK/Kip.

Provide your response in JSON format matching the schema.
`;

    const provider = config.provider?.toLowerCase() || 'gemini';
    let result: { text: string; promptTokens: number; completionTokens: number };

    if (provider === 'gemini') {
      const ai = new GoogleGenAI({ apiKey: config.apiKey });
      const response = await ai.models.generateContent({
        model: config.modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              hasPurchase: { type: 'BOOLEAN' },
              summary: {
                type: 'OBJECT',
                properties: {
                  customerName: { type: 'STRING' },
                  phone: { type: 'STRING' },
                  shippingAddress: { type: 'STRING' },
                  products: {
                    type: 'ARRAY',
                    items: {
                      type: 'OBJECT',
                      properties: {
                        name: { type: 'STRING' },
                        qty: { type: 'INTEGER' },
                        price: { type: 'INTEGER' },
                      },
                      required: ['name', 'qty', 'price'],
                    },
                  },
                  totalPrice: { type: 'INTEGER' },
                },
                required: ['customerName', 'phone', 'shippingAddress', 'products', 'totalPrice'],
              },
            },
            required: ['hasPurchase', 'summary'],
          },
        },
      });
      result = {
        text: response.text || '{}',
        promptTokens: 0,
        completionTokens: 0,
      };
    } else {
      // OpenAI-compatible JSON mode
      const baseUrl = (config.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.modelName,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`OpenAI-compatible API error (${response.status}): ${errBody}`);
      }

      const data = await response.json();
      result = {
        text: data.choices?.[0]?.message?.content || '{}',
        promptTokens: 0,
        completionTokens: 0,
      };
    }

    const jsonText = result.text || '{}';
    const parsed = JSON.parse(jsonText);
    return {
      success: true,
      hasPurchase: !!parsed.hasPurchase,
      summary: parsed.summary || null,
    };
  } catch (error) {
    console.error('[AI Service] Structured extraction failed:', error);
    return { success: false, hasPurchase: false, summary: null };
  }
}
