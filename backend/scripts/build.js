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
const BUNDLED_PUBLIC = path.resolve(DIST_DIR, 'public');
const DB_MIGRATIONS_SRC = path.resolve(SRC_DIR, 'db', 'migrations');
const DB_MIGRATIONS_DIST = path.resolve(DIST_DIR, 'migrations');
const PATCH_SCRIPT = path.resolve(__dirname, 'patch-fs-unlink.cjs');

/** Cache directories to clean pre-build */
const CACHE_DIRS = [
  path.resolve(FRONTEND_DIR, 'node_modules', '.cache'),
  path.resolve(FRONTEND_DIR, '.vite-cache'),
  FRONTEND_OUTPUT,
  DIST_DIR,
  BUNDLED_PUBLIC,
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
    if (process.platform === 'win32') {
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
    } else {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch (err) {
        log(`Warning: Could not remove ${rel}: ${err.message}`);
      }
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

      const nuxiPath = path.resolve(cwd, 'node_modules', '@nuxt', 'cli', 'bin', 'nuxi.mjs');
      const patchPath = PATCH_SCRIPT.replace(/\\/g, '/');
      const cmd = process.platform === 'win32'
        ? `node --require "${patchPath}" "${nuxiPath}" generate`
        : `node "${nuxiPath}" generate`;

      execSync(
        cmd,
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
  log('━━━ Step 0/5: Cleaning build caches ━━━');
  CACHE_DIRS.forEach(cleanDir);

  // --------------------------------------------------
  // Step 1: Build the Nuxt frontend (with EPERM fix)
  // --------------------------------------------------
  log('━━━ Step 1/5: Building frontend (Nuxt SPA) ━━━');
  buildFrontend(FRONTEND_DIR);

  if (!fs.existsSync(FRONTEND_OUTPUT)) {
    throw new Error(`Frontend build output not found at ${FRONTEND_OUTPUT}`);
  }
  log(`Frontend built: ${FRONTEND_OUTPUT}`);

  // --------------------------------------------------
  // --------------------------------------------------
  // Step 2: Bundle all backend TypeScript files via esbuild into single CJS files
  // --------------------------------------------------
  // Compiles all code and dependencies into self-contained .cjs files
  // so no npm install or node_modules are required on the server/VPS!
  log('━━━ Step 2/5: Bundling backend via esbuild (.ts ➔ .cjs) ━━━');
  
  // 1. Bundle main index.ts
  run(`npx esbuild src/index.ts --bundle --platform=node --target=node20 --outfile=dist/index.cjs`, ROOT);
  // 2. Bundle database migration runner
  run(`npx esbuild src/db/migrate.ts --bundle --platform=node --target=node20 --outfile=dist/migrate.cjs`, ROOT);
  // 3. Bundle database seed runner
  run(`npx esbuild src/db/seed.ts --bundle --platform=node --target=node20 --outfile=dist/seed.cjs`, ROOT);

  if (!fs.existsSync(DIST_DIR)) {
    throw new Error(`Backend dist output not found at ${DIST_DIR}`);
  }

  log(`Backend bundled: ${DIST_DIR}`);

  // --------------------------------------------------
  // Step 3: Bundle the frontend into backend/dist/
  // --------------------------------------------------
  log('━━━ Step 3/5: Bundling frontend into backend/dist/ ━━━');

  if (fs.existsSync(BUNDLED_PUBLIC)) {
    log(`Removing previous bundle`);
    if (process.platform === 'win32') {
      try {
        execSync(
          `if exist "${BUNDLED_PUBLIC}" rd /s /q "${BUNDLED_PUBLIC}" 2>nul`,
          { stdio: 'pipe', shell: 'cmd.exe' }
        );
      } catch {
        fs.rmSync(BUNDLED_PUBLIC, { recursive: true, force: true });
      }
    } else {
      fs.rmSync(BUNDLED_PUBLIC, { recursive: true, force: true });
    }
  }

  // Copy only the public/ directory (static output from nuxi generate).
  log(`Copying public/ → dist/public/`);
  fs.cpSync(FRONTEND_PUBLIC, BUNDLED_PUBLIC, { recursive: true });

  // --------------------------------------------------
  // Step 4: Copy DB migration SQL files to dist/
  // --------------------------------------------------
  // The compiled dist/migrate.cjs uses __dirname to find migrations,
  // so the SQL files must be present at dist/migrations/.
  log('━━━ Step 4/5: Copying DB migrations to dist/ ━━━');
  if (fs.existsSync(DB_MIGRATIONS_SRC)) {
    fs.cpSync(DB_MIGRATIONS_SRC, DB_MIGRATIONS_DIST, { recursive: true });
    log(`Copied migrations: ${DB_MIGRATIONS_DIST}`);
  } else {
    log(`Warning: No migrations found at ${DB_MIGRATIONS_SRC}`);
  }

  // --------------------------------------------------
  // Step 5: Copy deployment config files
  // --------------------------------------------------
  log('━━━ Step 5/5: Preparing production configuration files in dist/ ━━━');
  
  // Write a minimal package.json just for Plesk/Node environment detection
  const minimalPkg = {
    name: "facebook-chat-ai-production",
    version: "1.0.0",
    description: "Production self-contained build of Facebook Chat AI",
    main: "index.cjs",
    scripts: {
      "start": "node index.cjs",
      "db:migrate": "node migrate.cjs",
      "db:seed": "node seed.cjs"
    }
  };
  
  fs.writeFileSync(
    path.resolve(DIST_DIR, 'package.json'),
    JSON.stringify(minimalPkg, null, 2),
    'utf8'
  );
  log('Created minimal package.json ➔ dist/package.json');

  // Create .node-version file for Plesk/nodenv
  const nodeVersionSrc = path.resolve(ROOT, '.node-version');
  const nodeVersionDest = path.resolve(DIST_DIR, '.node-version');
  if (fs.existsSync(nodeVersionSrc)) {
    fs.copyFileSync(nodeVersionSrc, nodeVersionDest);
    log(`Copied .node-version ➔ dist/.node-version`);
  } else {
    fs.writeFileSync(nodeVersionDest, '20\n', 'utf8');
    log(`Created default .node-version ➔ dist/.node-version`);
  }

  // Copy .env.example
  const envExampleSrc = path.resolve(ROOT, '.env.example');
  const envExampleDest = path.resolve(DIST_DIR, '.env.example');
  if (fs.existsSync(envExampleSrc)) {
    fs.copyFileSync(envExampleSrc, envExampleDest);
    log(`Copied .env.example ➔ dist/.env.example`);
  }

  // --------------------------------------------------
  // Verify
  // --------------------------------------------------
  if (!fs.existsSync(path.resolve(DIST_DIR, 'index.cjs'))) {
    throw new Error(`Frontend bundle entry dist/index.cjs not found`);
  }

  log('━━━ ✅ Build complete! ━━━');
  log(`   Deployable folder : dist/`);
  log(`   Server Entry      : dist/index.cjs`);
  log(`   Migrate           : node dist/migrate.cjs (within dist: node migrate.cjs)`);
  log(`   Seed              : node dist/seed.cjs (within dist: node seed.cjs)`);
  log(`   Frontend Public   : dist/public/`);
  log(`   Deployment Startup: cd dist && NODE_ENV=production node index.cjs (No npm install required!)`);
} catch (err) {
  console.error(`\n[build] ❌ Build failed: ${err.message}`);
  process.exit(1);
}
