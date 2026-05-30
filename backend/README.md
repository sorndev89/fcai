# Facebook AI Chatbot — Backend

> Unified server: Express API + Nuxt SPA frontend bundled together.
> Single deployable unit: `node dist/index.js`

---

## 📁 Project Structure

```
backend/
├── dist/                          # ✅ Build output — upload to server
│   ├── index.js                   #    🎯 Express server
│   ├── index.js.map               #    Source map for debugging
│   ├── config/
│   │   └── db.js                  #    DB connection config
│   ├── db/
│   │   ├── migrate.js             #    🎯 Drizzle migration runner
│   │   ├── seed.js                #    🎯 Database seeder
│   │   ├── schema.js              #    DB schema definitions
│   │   └── migrations/            #    SQL migration files
│   ├── middleware/
│   │   └── auth.js                #    Auth middleware
│   ├── routes/
│   │   ├── admin.js
│   │   ├── aiConfig.js
│   │   ├── auth.js
│   │   ├── customers.js
│   │   ├── pages.js
│   │   ├── usage.js
│   │   └── webhook.js
│   ├── services/
│   │   ├── facebook.js
│   │   └── gemini.js
│   │       ├── 0000_*.sql
│   │       ├── 0001_*.sql
│   │       ├── 0002_*.sql
│   │       └── meta/
│   └── frontend/                  #    Bundled Nuxt SPA (from npm run build)
│       └── public/                #        Static assets (JS, CSS, fonts)
│           ├── favicon.ico
│           ├── robots.txt
│           ├── index.html
│           ├── 200.html
│           ├── 404.html
│           ├── admin/             #        Prerendered route pages
│           ├── dashboard/
│           ├── login/
│           ├── register/
│           └── _nuxt/             #        Hashed JS/CSS bundles
├── scripts/
│   ├── build.js                   #    Build orchestrator
│   └── patch-fs-unlink.cjs        #    Windows EPERM workaround
├── src/                           # ❌ Source code — NOT uploaded
│   ├── index.ts
│   ├── config/
│   ├── db/
│   ├── middleware/
│   ├── routes/
│   └── services/
├── node_modules/                  # ❌ Install on server via npm install --production
├── .env                           # ✅ Environment variables — upload to server
├── package.json                   # ✅ Dependencies — upload to server
├── package-lock.json              # ✅ Lockfile — upload to server
├── tsconfig.json                  # ❌ Build-time only — NOT uploaded
├── drizzle.config.ts              # ❌ Build-time only — NOT uploaded
└── vitest.config.ts               # ❌ Test-time only — NOT uploaded
```

### ✅ Files to Upload to Server

| File/Folder | Required | Purpose |
|---|---|---|
| [`dist/`](dist/) | ✅ **Yes** | Built app: server + migration/seed scripts + frontend SPA |
| [`package.json`](package.json) | ✅ **Yes** | Defines dependencies for `npm install --production` |
| [`package-lock.json`](package-lock.json) | ✅ **Yes** | Locks dependency versions for reproducible installs |
| [`.env`](.env) | ✅ **Yes** | **Must update credentials for production** (DB, JWT, Gemini API, etc.) |
| `node_modules/` | ❌ No | Install on server via `npm install --production` (see below) |

### ❌ Files NOT Needed on Server

| File/Folder | Reason |
|---|---|
| `src/` | All TypeScript source is already compiled into `dist/` (one `.js` file per `.ts` file) |
| `scripts/` | Build-time only: `build.js` and `patch-fs-unlink.cjs` are only needed during `npm run build` |
| [`drizzle.config.ts`](drizzle.config.ts) | **Only used during development** by `drizzle-kit` to **generate** migration SQL files (`npm run db:generate`). On the server you **run** the pre-generated migrations already inside `dist/db/migrations/` (via `node dist/db/migrate.js`). Not needed on server. |
| [`tsconfig.json`](tsconfig.json) | Build-time only: TypeScript compiler configuration. Not needed at runtime. |
| [`vitest.config.ts`](vitest.config.ts) | Test-time only: Vitest test runner configuration. Not needed on server. |
| `frontend/` (sibling folder) | Already built and bundled into `dist/frontend/public/`. Not needed. |
| `.nitro-cache/`, `.nuxt/`, `.output/`, `.output-dist/` | Build artifacts from Nuxt/Vite. Only used during frontend build. Not needed. |

> **Standard multi-file output:** The build uses the TypeScript compiler (`tsc`) to produce one `.js` file per `.ts` source file (standard approach). SQL migration files are copied to `dist/db/migrations/`. Production dependencies (`express`, `drizzle-orm`, etc.) are installed via `npm install --production` at runtime.

---

## 🚀 Deployment Guide

### Option A: Upload Pre-Built Output (Recommended)

Build locally, then upload only what's needed.

#### Step 1: Build locally (Windows dev machine)

```bash
# From the backend/ directory
npm install            # Install dependencies
npm run build          # Full build: compile backend via tsc + generate Nuxt SPA
```

#### Step 2: Upload to server

Upload these **files & folders** to your server:

| File/Folder | Required? | Notes |
|---|---|---|
| `backend/dist/` | ✅ **Yes** | All compiled `.js` files + `frontend/` static assets + `db/migrations/` SQL files |
| `backend/package.json` | ✅ **Yes** | For `npm install --production` |
| `backend/package-lock.json` | ✅ **Yes** | Lockfile for reproducible installs |
| `backend/.env` | ✅ **Yes** | **Must update credentials for production** |
| `node_modules/` | ❌ No | Run `npm install --production` on server instead |

#### Step 3: Install production dependencies on server

```bash
cd /path/to/backend
npm install --production
```

#### Step 4: Run database migrations

```bash
node dist/db/migrate.js
```

#### Step 5: (Optional) Seed the database

```bash
node dist/db/seed.js
```

#### Step 6: Start the server

```bash
NODE_ENV=production node dist/index.js
```

Or with a process manager (recommended):

```bash
# Using PM2
npm install -g pm2
NODE_ENV=production pm2 start dist/index.js --name "fb-chat-ai"

# Using systemd (Linux)
# Create a .service file that runs:
#   NODE_ENV=production node /path/to/backend/dist/index.js
```

---

### 🌐 Plesk Panel Deployment

For hosting on **Plesk** (Node.js extension):

#### Step 1: Upload files

Upload only these files/folders to your Plesk server (via FTP or File Manager):

```
backend/
├── dist/                    # ✅ Built app (upload this)
│   ├── index.js
│   ├── db/
│   │   ├── migrate.js
│   │   ├── seed.js
│   │   └── migrations/
│   └── frontend/public/
├── package.json             # ✅ Upload this (needed for npm install)
├── package-lock.json        # ✅ Upload this
├── .env                     # ✅ Upload this (with production credentials)
```

> **Do NOT upload:** `src/`, `scripts/`, `node_modules/`, `drizzle.config.ts`, `tsconfig.json`, `vitest.config.ts`, or any frontend build artifacts.

#### Step 2: Configure Plesk Node.js

1. In Plesk, go to **"Node.js"** for your domain/subdomain
2. Set the **Document Root** to the `backend/` folder (e.g., `/var/www/vhosts/yourdomain.com/httpdocs/backend`)
3. Set **Application Startup File** to `dist/index.js`
4. Set **Application Mode** to `production`
5. Set environment variables in Plesk UI (or use the `.env` file you uploaded)
   - `NODE_ENV=production`
   - `PORT=5000` (or whatever Plesk assigns)
   - `DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY`, `FB_VERIFY_TOKEN`
6. Click **"NPM install"** button in Plesk UI — this runs `npm install --production`
7. Click **"Run script"** and input `node dist/db/migrate.js` to apply migrations
8. (Optional) Click **"Run script"** and input `node dist/db/seed.js` to seed data
9. Click **"Enable"** or **"Restart"** to start the app

> **IMPORTANT:** After any code updates, re-run `npm run build` locally, re-upload the new `dist/` folder, and restart the Node.js app in Plesk.

---

### Option B: Build Directly on Server (CLI-based hosts, not Plesk)

If your server has Node.js v20+ and npm, you can clone the entire repo and build there.

```bash
# 1. Clone the repository
git clone <repo-url> /app
cd /app/backend

# 2. Install ALL dependencies (including devDependencies for building)
npm install

# 3. Build
npm run build

# 4. Run migrations
node dist/db/migrate.js

# 5. (Optional) Seed database
node dist/db/seed.js

# 6. Start
NODE_ENV=production node dist/index.js
```

> ⚠️ **Windows → Linux server:** The build script works on both platforms. The EPERM patch is Windows-only and safely ignored on Linux. For Plesk, always build locally on your Windows machine and upload only the `dist/` folder (Option A) — Plesk typically does not have build tooling installed.

---

## 🔧 Available Commands

All commands run from the `backend/` directory.

| Command | Description |
|---|---|
| `npm run build` | Full build: compile backend via `tsc` + generate Nuxt SPA |
| `npm run build:backend` | Compile TypeScript only via `tsc` (multi-file output) |
| `npm run build:frontend` | Build Nuxt SPA only |
| `npm start` | Start production server (`node dist/index.js`) |
| `npm run dev` | Start dev mode (backend + frontend concurrently) |
| `npm run dev:backend` | Start backend dev server only (with hot-reload) |
| `npm run test` | Run tests |
| `npm run db:generate` | Generate Drizzle ORM migrations |
| `npm run db:migrate` | Apply database migrations (`node dist/db/migrate.js`) |
| `npm run db:seed` | Seed database with initial data (`node dist/db/seed.js`) |

---

## 🌐 Environment Variables (`.env`)

| Variable | Required | Description | Example |
|---|---|---|---|
| `PORT` | No | Server port (default: `5000`) | `5000` |
| `DATABASE_URL` | **Yes** | MySQL connection string | `mysql://user:pass@host:3306/fb_chat_ai` |
| `JWT_SECRET` | **Yes** | Secret key for JWT tokens | `<random-64-char-string>` |
| `GEMINI_API_KEY` | **Yes** | Google Gemini AI API key | `<your-gemini-key>` |
| `FB_VERIFY_TOKEN` | **Yes** | Facebook Webhook verify token | `<random-string>` |
| `NODE_ENV` | No | `production` or `development` (default) | `production` |

> 🔒 **Security:** Generate strong secrets for production:
> ```bash
> # Generate a random JWT_SECRET (64 chars)
> node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
> ```

---

## 🔍 Verifying the Deployment

After starting the server, check these endpoints:

```bash
# Health check
curl http://your-server:5000/health
# → {"status":"ok","environment":"production","timestamp":"..."}

# API test
curl http://your-server:5000/api/auth/login -X POST -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"test"}'

# Frontend SPA
curl http://your-server:5000/
# → Returns index.html (the Nuxt SPA)
```

---

## 🐳 Docker Deployment (Optional)

Create a `Dockerfile` in the `backend/` directory:

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY backend/package*.json ./
RUN npm install
COPY backend/ ./
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.env ./
RUN npm install --production
EXPOSE 5000
CMD ["node", "dist/index.js"]
```

Build and run:

```bash
docker build -t fb-chat-ai -f backend/Dockerfile .
docker run -p 5000:5000 fb-chat-ai
```
