# Project Specification: Facebook AI Chatbot SaaS Platform

## 1. Project Overview
A multi-tenant SaaS application that allows business owners (Tenants) to connect their Facebook Pages and deploy an intelligent, AI-powered customer service chatbot. The platform has a dedicated Administrator interface for the SaaS Owner to approve tenant sign-ups, set packages/tiers, control token/page limits, and record payment logs.

---

## 2. Platform Roles & Features

```mermaid
graph TD
    UserClass([Any User]) -->|Login| LoginRoute[Single /login Route]
    LoginRoute -->|Auth Verify| AuthStore{Check User Role}
    
    AuthStore -->|role == admin| AdminDashboard[pages/admin/ & layouts/admin.vue]
    AuthStore -->|role == tenant| TenantDashboard[pages/dashboard/ & layouts/default.vue]
    
    subgraph SaaS Owner (Admin)
        AdminDashboard --> AdminUsers[Approve Tenant Access]
        AdminDashboard --> AdminPackages[Manage Subscription Packages]
        AdminDashboard --> AdminBilling[Record Payments & Token Costs]
    end
    
    subgraph Business Tenant (User)
        TenantDashboard --> TenantPages[Page Connector - Max Page limits]
        TenantDashboard --> TenantKB[Knowledge Base Trainer]
        TenantDashboard --> TenantCRM[Customer profile notes & usage metrics]
        TenantDashboard --> TenantOrderSummary[AI Chat Log Order Summary Analyzer]
    end
```

### A. SaaS Owner (Admin)
- **Tenant Management**: Approve or reject pending tenant registrations. Suspended tenants cannot log in or activate bots.
- **Package Editor**: Create and manage pricing tiers. Each tier specifies:
  - Max connected pages allowed.
  - Max token count allowed.
  - Price (Kip / Month).
- **Billing Console**: Calculate tenant token consumption and record payment status (paid, pending).

### B. Business Tenant (User/Customer)
- **Registration**: Select an active subscription package upon registering.
- **Bot Settings**: Connect FB pages up to their package limit. Train knowledge bases.
- **Usage Panel**: Display token consumption progress bars showing usage versus package limits.
- **CRM Profiles**: Maintain address, phone, and AI custom notes.
- **AI Order Summary**: A RAG-powered feature that parses customer thread logs and generates an order details summary (items, quantity, delivery details, purchase intent status).

---

## 3. Database Schema (Drizzle ORM - MySQL)

```typescript
import { mysqlTable, varchar, text, boolean, timestamp, integer, decimal } from 'drizzle-orm/mysql-core';

// 1. Subscription Packages
export const packages = mysqlTable('packages', {
  id: varchar('id', { length: 36 }).primaryKey(), // UUID v4
  name: varchar('name', { length: 255 }).notNull(), // e.g. Starter, Pro, Premium
  maxPages: integer('max_pages').notNull().default(1),
  maxTokens: integer('max_tokens').notNull().default(10000),
  price: decimal('price', { precision: 12, scale: 2 }).notNull().default('0.00'), // Cost in Kip
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
  packageId: varchar('package_id', { length: 36 }), // Reference package table
  createdAt: timestamp('created_at').defaultNow(),
});

// 3. Connected Facebook Pages
export const pages = mysqlTable('pages', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  fbPageId: varchar('fb_page_id', { length: 255 }).notNull().unique(),
  fbPageName: varchar('fb_page_name', { length: 255 }).notNull(),
  fbPageAccessToken: text('fb_page_access_token').notNull(),
  knowledgeBase: text('knowledge_base').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// 4. Customers (End-users messaging the page)
export const customers = mysqlTable('customers', {
  id: varchar('id', { length: 36 }).primaryKey(),
  pageId: varchar('page_id', { length: 36 }).notNull(),
  fbPsid: varchar('fb_psid', { length: 255 }).notNull().unique(),
  fullName: varchar('full_name', { length: 255 }),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  profilePic: text('profile_pic'),
  phoneNumber: varchar('phone_number', { length: 50 }),
  email: varchar('email', { length: 255 }),
  address: text('address'),
  notes: text('notes'), // Custom context profile loaded in AI prompt
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// 5. Chat Logs (Conversation records)
export const chatLogs = mysqlTable('chat_logs', {
  id: varchar('id', { length: 36 }).primaryKey(),
  pageId: varchar('page_id', { length: 36 }).notNull(),
  customerId: varchar('customer_id', { length: 36 }).notNull(),
  messageIn: text('message_in').notNull(),
  messageOut: text('message_out').notNull(),
  tokenCount: integer('token_count').default(0), // Count consumed for calculation
  createdAt: timestamp('created_at').defaultNow(),
});

// 6. Payment & Billing Register
export const payments = mysqlTable('payments', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  packageId: varchar('package_id', { length: 36 }).notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending' | 'paid'
  recordedBy: varchar('recorded_by', { length: 36 }), // SaaS Admin UID
  paymentDate: timestamp('payment_date'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

---

## 4. Nuxt 4 Frontend Folder Structure

```text
frontend/
├── app/
│   ├── layouts/
│   │   ├── default.vue        # Tenant/User layout (with Connected Pages, CRM menus)
│   │   └── admin.vue          # SaaS Owner layout (with User list, Packages, Billing menus)
│   ├── pages/
│   │   ├── index.vue          # Shared Landing Page
│   │   ├── login.vue          # Single Authenticating Form
│   │   ├── register.vue       # Register with Package Selector
│   │   ├── admin/             # SaaS Owner Workspace
│   │   │   ├── index.vue      # Users/Tenants Approval list
│   │   │   ├── packages.vue   # Manage Pricing Tiers
│   │   │   └── billing.vue    # Record Payment logs
│   │   └── dashboard/         # Business Tenant Workspace
│   │       ├── index.vue      # Connect pages and show usage metrics
│   │       ├── pages/
│   │       │   └── [id].vue   # KB editor & webhook simulator
│   │       └── customers/
│   │           └── [id].vue   # CRM, Chat log viewer & order summaries
```