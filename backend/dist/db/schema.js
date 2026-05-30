"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiConfig = exports.payments = exports.chatLogs = exports.customers = exports.pages = exports.users = exports.packages = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
// 1. Subscription Packages
exports.packages = (0, mysql_core_1.mysqlTable)('packages', {
    id: (0, mysql_core_1.varchar)('id', { length: 36 }).primaryKey(), // UUID v4
    name: (0, mysql_core_1.varchar)('name', { length: 255 }).notNull(), // e.g. Starter, Pro, Premium
    maxPages: (0, mysql_core_1.int)('max_pages').notNull().default(1),
    maxTokens: (0, mysql_core_1.int)('max_tokens').notNull().default(10000),
    price: (0, mysql_core_1.decimal)('price', { precision: 12, scale: 2 }).notNull().default('0.00'), // Price in Kip
    isActive: (0, mysql_core_1.boolean)('is_active').default(true),
    createdAt: (0, mysql_core_1.timestamp)('created_at').defaultNow(),
});
// 2. Users (SaaS Owner OR Business Owner Tenant)
exports.users = (0, mysql_core_1.mysqlTable)('users', {
    id: (0, mysql_core_1.varchar)('id', { length: 36 }).primaryKey(), // UUID v4
    email: (0, mysql_core_1.varchar)('email', { length: 255 }).notNull().unique(),
    password: (0, mysql_core_1.varchar)('password', { length: 255 }).notNull(),
    name: (0, mysql_core_1.varchar)('name', { length: 255 }).notNull(),
    role: (0, mysql_core_1.varchar)('role', { length: 50 }).notNull().default('tenant'), // 'admin' | 'tenant'
    status: (0, mysql_core_1.varchar)('status', { length: 50 }).notNull().default('pending'), // 'pending' | 'approved' | 'suspended'
    packageId: (0, mysql_core_1.varchar)('package_id', { length: 36 }), // references packages
    createdAt: (0, mysql_core_1.timestamp)('created_at').defaultNow(),
});
// 3. Connected Facebook Pages
exports.pages = (0, mysql_core_1.mysqlTable)('pages', {
    id: (0, mysql_core_1.varchar)('id', { length: 36 }).primaryKey(), // UUID v4
    userId: (0, mysql_core_1.varchar)('user_id', { length: 36 }).notNull(), // Owner of this page connection
    fbPageId: (0, mysql_core_1.varchar)('fb_page_id', { length: 255 }).notNull().unique(), // FB Page ID
    fbPageName: (0, mysql_core_1.varchar)('fb_page_name', { length: 255 }).notNull(),
    fbPageAccessToken: (0, mysql_core_1.text)('fb_page_access_token').notNull(),
    knowledgeBase: (0, mysql_core_1.text)('knowledge_base').notNull(), // The context knowledge for AI response
    isActive: (0, mysql_core_1.boolean)('is_active').default(true),
    createdAt: (0, mysql_core_1.timestamp)('created_at').defaultNow(),
});
// 4. Customers (End-users messaging the FB page)
exports.customers = (0, mysql_core_1.mysqlTable)('customers', {
    id: (0, mysql_core_1.varchar)('id', { length: 36 }).primaryKey(), // UUID v4
    pageId: (0, mysql_core_1.varchar)('page_id', { length: 36 }).notNull(), // Target page
    fbPsid: (0, mysql_core_1.varchar)('fb_psid', { length: 255 }).notNull().unique(), // Page-Scoped ID (PSID)
    fullName: (0, mysql_core_1.varchar)('full_name', { length: 255 }), // Customer full name fetched from FB
    firstName: (0, mysql_core_1.varchar)('first_name', { length: 255 }),
    lastName: (0, mysql_core_1.varchar)('last_name', { length: 255 }),
    profilePic: (0, mysql_core_1.text)('profile_pic'), // URL of FB profile picture
    phoneNumber: (0, mysql_core_1.varchar)('phone_number', { length: 50 }), // Captured or manually entered
    email: (0, mysql_core_1.varchar)('email', { length: 255 }),
    address: (0, mysql_core_1.text)('address'),
    notes: (0, mysql_core_1.text)('notes'), // Business owner's notes about the customer (read by AI)
    createdAt: (0, mysql_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)('updated_at').defaultNow().onUpdateNow(),
});
// 5. Chat Logs (Conversation history)
exports.chatLogs = (0, mysql_core_1.mysqlTable)('chat_logs', {
    id: (0, mysql_core_1.varchar)('id', { length: 36 }).primaryKey(), // UUID v4
    pageId: (0, mysql_core_1.varchar)('page_id', { length: 36 }).notNull(),
    customerId: (0, mysql_core_1.varchar)('customer_id', { length: 36 }).notNull(), // Linked to customer
    messageIn: (0, mysql_core_1.text)('message_in').notNull(), // Customer message
    messageOut: (0, mysql_core_1.text)('message_out').notNull(), // AI reply
    tokenCount: (0, mysql_core_1.int)('token_count').default(0), // Count consumed for calculation
    createdAt: (0, mysql_core_1.timestamp)('created_at').defaultNow(),
});
// 6. Payment & Billing Register
exports.payments = (0, mysql_core_1.mysqlTable)('payments', {
    id: (0, mysql_core_1.varchar)('id', { length: 36 }).primaryKey(), // UUID v4
    userId: (0, mysql_core_1.varchar)('user_id', { length: 36 }).notNull(),
    packageId: (0, mysql_core_1.varchar)('package_id', { length: 36 }).notNull(),
    amount: (0, mysql_core_1.decimal)('amount', { precision: 12, scale: 2 }).notNull(),
    status: (0, mysql_core_1.varchar)('status', { length: 50 }).notNull().default('pending'), // 'pending' | 'paid'
    recordedBy: (0, mysql_core_1.varchar)('recorded_by', { length: 36 }), // SaaS Admin User ID
    paymentDate: (0, mysql_core_1.timestamp)('payment_date'),
    createdAt: (0, mysql_core_1.timestamp)('created_at').defaultNow(),
});
// 7. AI Configuration (SaaS Admin manages which AI model/provider is active)
exports.aiConfig = (0, mysql_core_1.mysqlTable)('ai_config', {
    id: (0, mysql_core_1.varchar)('id', { length: 36 }).primaryKey(),
    provider: (0, mysql_core_1.varchar)('provider', { length: 100 }).notNull().default('gemini'),
    modelName: (0, mysql_core_1.varchar)('model_name', { length: 255 }).notNull().default('gemini-2.0-flash'),
    apiKey: (0, mysql_core_1.text)('api_key').notNull(),
    baseUrl: (0, mysql_core_1.varchar)('base_url', { length: 500 }), // For OpenAI-compatible APIs
    isActive: (0, mysql_core_1.boolean)('is_active').default(true),
    updatedAt: (0, mysql_core_1.timestamp)('updated_at').defaultNow().onUpdateNow(),
    createdAt: (0, mysql_core_1.timestamp)('created_at').defaultNow(),
});
//# sourceMappingURL=schema.js.map