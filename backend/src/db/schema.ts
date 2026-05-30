import { mysqlTable, varchar, text, boolean, timestamp, int, decimal } from 'drizzle-orm/mysql-core';

// 1. Subscription Packages
export const packages = mysqlTable('packages', {
  id: varchar('id', { length: 36 }).primaryKey(), // UUID v4
  name: varchar('name', { length: 255 }).notNull(), // e.g. Starter, Pro, Premium
  maxPages: int('max_pages').notNull().default(1),
  maxTokens: int('max_tokens').notNull().default(10000),
  price: decimal('price', { precision: 12, scale: 2 }).notNull().default('0.00'), // Price in Kip
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// 2. Users (SaaS Owner OR Business Owner Tenant)
export const users = mysqlTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(), // UUID v4
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('tenant'), // 'admin' | 'tenant'
  status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending' | 'approved' | 'suspended'
  packageId: varchar('package_id', { length: 36 }), // references packages
  createdAt: timestamp('created_at').defaultNow(),
});

// 3. Connected Facebook Pages
export const pages = mysqlTable('pages', {
  id: varchar('id', { length: 36 }).primaryKey(), // UUID v4
  userId: varchar('user_id', { length: 36 }).notNull(), // Owner of this page connection
  fbPageId: varchar('fb_page_id', { length: 255 }).notNull().unique(), // FB Page ID
  fbPageName: varchar('fb_page_name', { length: 255 }).notNull(),
  fbPageAccessToken: text('fb_page_access_token').notNull(),
  knowledgeBase: text('knowledge_base').notNull(), // The context knowledge for AI response
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// 4. Customers (End-users messaging the FB page)
export const customers = mysqlTable('customers', {
  id: varchar('id', { length: 36 }).primaryKey(), // UUID v4
  pageId: varchar('page_id', { length: 36 }).notNull(), // Target page
  fbPsid: varchar('fb_psid', { length: 255 }).notNull().unique(), // Page-Scoped ID (PSID)
  fullName: varchar('full_name', { length: 255 }), // Customer full name fetched from FB
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  profilePic: text('profile_pic'), // URL of FB profile picture
  phoneNumber: varchar('phone_number', { length: 50 }), // Captured or manually entered
  email: varchar('email', { length: 255 }),
  address: text('address'),
  notes: text('notes'), // Business owner's notes about the customer (read by AI)
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// 5. Chat Logs (Conversation history)
export const chatLogs = mysqlTable('chat_logs', {
  id: varchar('id', { length: 36 }).primaryKey(), // UUID v4
  pageId: varchar('page_id', { length: 36 }).notNull(),
  customerId: varchar('customer_id', { length: 36 }).notNull(), // Linked to customer
  messageIn: text('message_in').notNull(), // Customer message
  messageOut: text('message_out').notNull(), // AI reply
  tokenCount: int('token_count').default(0), // Count consumed for calculation
  createdAt: timestamp('created_at').defaultNow(),
});

// 6. Payment & Billing Register
export const payments = mysqlTable('payments', {
  id: varchar('id', { length: 36 }).primaryKey(), // UUID v4
  userId: varchar('user_id', { length: 36 }).notNull(),
  packageId: varchar('package_id', { length: 36 }).notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending' | 'paid'
  recordedBy: varchar('recorded_by', { length: 36 }), // SaaS Admin User ID
  paymentDate: timestamp('payment_date'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 7. AI Configuration (SaaS Admin manages which AI model/provider is active)
export const aiConfig = mysqlTable('ai_config', {
  id: varchar('id', { length: 36 }).primaryKey(),
  provider: varchar('provider', { length: 100 }).notNull().default('gemini'),
  modelName: varchar('model_name', { length: 255 }).notNull().default('gemini-2.0-flash'),
  apiKey: text('api_key').notNull(),
  baseUrl: varchar('base_url', { length: 500 }), // For OpenAI-compatible APIs
  isActive: boolean('is_active').default(true),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  createdAt: timestamp('created_at').defaultNow(),
});
