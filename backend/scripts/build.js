/**
 * Build Orchestrator
 *
 * Builds the frontend (Nuxt) and backend (TypeScript), then bundles the
 * frontend build output into backend/dist/ so that a single
 * "node dist/index.js" command serves both API and SPA on one port.
 *
 * ## Windows EPERM workaround
 *
 * On Windows, VS Code's TypeScript language server holds file handles on
 * .d.ts and .json files inside node_modules/.cache/nuxt/, preventing
 * Node.js's fs.unlink() from deleting/overwriting them (EPERM).
 *
 * This script injects a preload module (patch-fs-unlink.cjs) via NODE_OPTIONS
 * which monkey-patches fs.unlinkSync / fs.unlink / fs.promises.unlink to
 * fall back to the Windows `del /f /q` command when EPERM is encountered.
 * The `del` command uses a different Windows API (DeleteFileW) that can
 * force-delete files even when another process holds a handle.
 *
 * Usage:  node scripts/build.js
 *         npm run build        (via package.json)
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.resolve(ROOT, 'src');
const FRONTEND_DIR = path.resolve(ROOT, '..', 'frontend');
const DIST_DIR = path.resolve(ROOT, 'dist');
const FRONTEND_OUTPUT = path.resolve(FRONTEND_DIR, '.output-dist');
const FRONTEND_PUBLIC = path.resolve(FRONTEND_OUTPUT, 'public');
const BUNDLED_FRONTEND = path.resolve(DIST_DIR, 'frontend');
const BUNDLED_FRONTEND_PUBLIC = path.resolve(BUNDLED_FRONTEND, 'public');
const DB_MIGRATIONS_SRC = path.resolve(SRC_DIR, 'db', 'migrations');
const DB_MIGRATIONS_DIST = path.resolve(DIST_DIR, 'db', 'migrations');
const PATCH_SCRIPT = path.resolve(__dirname, 'patch-fs-unlink.cjs');

/** Cache directories to clean pre-build */
const CACHE_DIRS = [
  path.resolve(FRONTEND_DIR, 'node_modules', '.cache'),
  path.resolve(FRONTEND_DIR, '.vite-cache'),
  FRONTEND_OUTPUT,
  DIST_DIR,
  BUNDLED_FRONTEND,
];

function log(msg) {
  console.log(`[build] ${msg}`);
}

function run(cmd, cwd) {
  log(`Executing: ${cmd} (in ${path.relative(ROOT, cwd) || '.'})`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

/**
 * Force-delete a directory using Windows cmd.exe built-in commands.
 * del /f /s /q /a  forcibly removes all files (incl. hidden/readonly).
 * rd /s /q         removes the empty directory tree.
 *
 * This is more resilient than fs.rmSync() for locked file handles because
 * cmd.exe's `del` uses the Windows DeleteFileW API directly.
 */
function cleanDir(dir) {
  if (fs.existsSync(dir)) {
    const rel = path.relative(ROOT, dir);
    log(`Cleaning cache: ${rel}`);
    try {
      execSync(
        `if exist "${dir}" (` +
        `  del /f /s /q /a "${dir}\\*" 2>nul &` +
        `  rd /s /q "${dir}" 2>nul` +
        `)`,
        { stdio: 'pipe', shell: 'cmd.exe' }
      );
    } catch {
      log(`Warning: Could not fully remove ${rel} (files may still be locked)`);
    }
  }
}

/**
 * Build the Nuxt frontend.
 *
 * Injects patch-fs-unlink.cjs via NODE_OPTIONS so that any EPERM errors
 * from fs.unlink() are intercepted and handled by falling back to the
 * Windows `del /f` command (which can delete files locked by VS Code).
 *
 * A retry loop is kept as a safety net in case the patch doesn't cover
 * a particular code path.
 */
function buildFrontend(cwd) {
  const maxRetries = 2;
  const patchRel = path.relative(ROOT, PATCH_SCRIPT);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      log(`━━━ Frontend build attempt ${attempt}/${maxRetries} ━━━`);

      // IMPORTANT: Do NOT use `npm run build` here — npm v11+ strips the
      // NODE_OPTIONS environment variable from child processes for security,
      // which would prevent the EPERM patch from being applied.
      //
      // Instead, invoke the Nuxt CLI binary directly via node --require so
      // the patch is loaded before any nuxt/nitro code runs.
      //
      // We use `nuxi generate` (not `nuxi build`) because:
      //   - The app is SPA mode (ssr: false) — no SSR needed
      //   - Express already serves static files and handles SPA routing
      //   - `nuxt build` generates a redundant Nitro server (node-server preset)
      //   - `nuxt generate` outputs only static files (public/) — faster, smaller
      const nuxiPath = path.resolve(cwd, 'node_modules', '@nuxt', 'cli', 'bin', 'nuxi.mjs');
      const patchPath = PATCH_SCRIPT.replace(/\\/g, '/');
      execSync(
        `node --require "${patchPath}" "${nuxiPath}" generate`,
        { cwd, stdio: 'inherit', env: { ...process.env, NODE_OPTIONS: undefined } }
      );

      log(`Frontend build succeeded on attempt ${attempt}`);
      return;
    } catch (err) {
      if (attempt >= maxRetries) {
        log(`❌ Frontend build failed after ${maxRetries} attempts`);
        throw err;
      }

      log(`⚠️  Build attempt ${attempt} failed — retrying after cache clean...`);

      // Clean caches and wait
      CACHE_DIRS.forEach(cleanDir);

      // Simple busy-wait for 3 seconds (timeout command fails in some shells)
      log('Waiting 3 seconds...');
      const t0 = Date.now();
      while (Date.now() - t0 < 3000) { /* busy-wait */ }
    }
  }
}

try {
  // --------------------------------------------------
  // Step 0: Clean caches
  // --------------------------------------------------
  log('━━━ Step 0/4: Cleaning build caches ━━━');
  CACHE_DIRS.forEach(cleanDir);

  // --------------------------------------------------
  // Step 1: Build the Nuxt frontend (with EPERM fix)
  // --------------------------------------------------
  log('━━━ Step 1/4: Building frontend (Nuxt SPA) ━━━');
  buildFrontend(FRONTEND_DIR);

  if (!fs.existsSync(FRONTEND_OUTPUT)) {
    throw new Error(`Frontend build output not found at ${FRONTEND_OUTPUT}`);
  }
  log(`Frontend built: ${FRONTEND_OUTPUT}`);

  // --------------------------------------------------
  // Step 2: Compile all backend TypeScript via tsc (standard multi-file output)
  // --------------------------------------------------
  // Uses the TypeScript compiler (`tsc`) to produce one `.js` file per `.ts`
  // source file. This is the standard approach — multiple files, no bundling.
  //
  // tsc outputs to dist/ (as configured in tsconfig.json):
  //   dist/index.js
  //   dist/config/db.js
  //   dist/db/migrate.js
  //   dist/db/seed.js
  //   dist/db/schema.js
  //   dist/middleware/auth.js
  //   dist/routes/*.js
  //   dist/services/*.js
  log('━━━ Step 2/4: Compiling backend (tsc → .js) ━━━');
  run(`npx tsc`, ROOT);

  if (!fs.existsSync(DIST_DIR)) {
    throw new Error(`Backend dist output not found at ${DIST_DIR}`);
  }

  log(`Backend compiled: ${DIST_DIR}`);

  // --------------------------------------------------
  // Step 3: Bundle the frontend into backend/dist/
  // --------------------------------------------------
  log('━━━ Step 3/4: Bundling frontend into backend/dist/ ━━━');

  if (fs.existsSync(BUNDLED_FRONTEND)) {
    log(`Removing previous bundle`);
    try {
      execSync(
        `if exist "${BUNDLED_FRONTEND}" rd /s /q "${BUNDLED_FRONTEND}" 2>nul`,
        { stdio: 'pipe', shell: 'cmd.exe' }
      );
    } catch {
      fs.rmSync(BUNDLED_FRONTEND, { recursive: true, force: true });
    }
  }

  // Copy only the public/ directory (static output from nuxi generate).
  // The Nitro server (server/) is excluded because Express handles SPA
  // serving in production — no need for a redundant Nitro runtime.
  // Express expects the files at dist/frontend/public/ (see src/index.ts).
  log(`Copying public/ → dist/frontend/public/`);
  fs.cpSync(FRONTEND_PUBLIC, BUNDLED_FRONTEND_PUBLIC, { recursive: true });

  // --------------------------------------------------
  // Step 4: Copy DB migration SQL files to dist/
  // --------------------------------------------------
  // The compiled dist/db/migrate.js uses __dirname to find migrations,
  // so the SQL files must be present at dist/db/migrations/.
  log('━━━ Step 4/4: Copying DB migrations to dist/ ━━━');
  if (fs.existsSync(DB_MIGRATIONS_SRC)) {
    fs.cpSync(DB_MIGRATIONS_SRC, DB_MIGRATIONS_DIST, { recursive: true });
    log(`Copied migrations: ${DB_MIGRATIONS_DIST}`);
  } else {
    log(`Warning: No migrations found at ${DB_MIGRATIONS_SRC}`);
  }

  // --------------------------------------------------
  // Verify
  // --------------------------------------------------
  if (!fs.existsSync(BUNDLED_FRONTEND_PUBLIC)) {
    throw new Error(`Frontend bundle not found at ${BUNDLED_FRONTEND_PUBLIC}`);
  }

  log('━━━ ✅ Build complete! ━━━');
  log(`   Server   : dist/index.js`);
  log(`   Migrate  : node dist/db/migrate.js`);
  log(`   Seed     : node dist/db/seed.js`);
  log(`   Frontend : dist/frontend/public/`);
  log(`   Startup  : NODE_ENV=production node dist/index.js`);
  log(`   Or       : npm start`);
} catch (err) {
  console.error(`\n[build] ❌ Build failed: ${err.message}`);
  process.exit(1);
}
