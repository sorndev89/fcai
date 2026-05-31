import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth';
import pageRoutes from './routes/pages';
import webhookRoutes from './routes/webhook';
import customerRoutes from './routes/customers';
import adminRoutes from './routes/admin';
import usageRoutes from './routes/usage';
import aiConfigRoutes from './routes/aiConfig';
import facebookOAuthRoutes from './routes/facebook-oauth';
import paymentRoutes from './routes/payments';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

// Serve uploaded files (payment slips & QR codes)
const uploadsPath = path.resolve(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath));

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', environment: NODE_ENV, timestamp: new Date() });
});

// Helper route to trigger migrations via web browser
app.get('/api/run-migrations', async (req, res) => {
  try {
    const { migrate } = await import('drizzle-orm/mysql2/migrator');
    const { db } = await import('./config/db');
    let migrationsFolder = path.resolve(__dirname, 'migrations');
    if (!fs.existsSync(migrationsFolder)) {
      migrationsFolder = path.resolve(__dirname, 'db', 'migrations');
    }
    await migrate(db, { migrationsFolder });
    res.json({ success: true, message: 'Migrations completed successfully!' });
  } catch (err: any) {
    console.error('Web migrations error:', err);
    res.status(500).json({ success: false, error: err.message || err });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/pages', pageRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/admin/ai-config', aiConfigRoutes);
app.use('/webhook/facebook', webhookRoutes);
app.use('/api/auth/facebook', facebookOAuthRoutes);
app.use('/api/payments', paymentRoutes);

// -------------------------------------------------------
// Production: Serve the bundled frontend SPA directly
// -------------------------------------------------------
// The Nuxt SPA is built and bundled into backend/dist/frontend/ by
// the `npm run build` (or `node scripts/build.js`) command.
//
// Express serves:
//   1. Static assets (JS, CSS, images) from frontend/public/
//   2. SPA fallback: any non-API request returns index.html
//
// This eliminates the need for a separate Nitro server process,
// providing a single deployable unit:  node dist/index.js
// -------------------------------------------------------
const frontendPath = path.resolve(__dirname, 'public');

if (fs.existsSync(frontendPath)) {
  console.log(`[Server] Serving frontend from ${frontendPath}`);

  // 1. Serve static assets (JS, CSS, images) from frontend/public/
  app.use(express.static(frontendPath, {
    // Cache static assets for 1 year (fingerprinted filenames)
    maxAge: '1y',
    immutable: true,
  }));

  // 2. SPA fallback: return index.html for any non-API request
  //    (lets Vue Router handle client-side routing)
  app.use('*', (req, res, next) => {
    // Let API/webhook routes pass through (they'll 404 normally)
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/webhook') ||
      req.path === '/health'
    ) {
      return next();
    }
    res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
      if (err) {
        console.error('[Server] Failed to serve index.html:', err.message);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  });

  console.log(`[Server] Frontend bundled. Access the app at http://localhost:${PORT}`);
} else {
  if (NODE_ENV === 'production') {
    console.warn(`[Server] WARNING: Frontend build not found at ${frontendPath}`);
    console.warn(`[Server] Run 'npm run build' first to generate the full build.`);
    console.warn(`[Server] Express will serve API only on port ${PORT}.`);
  } else {
    console.log(`[Server] Development mode: frontend build not present. Run separately on its own dev server.`);
  }
}

// Start Server
const server = app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  Facebook AI Chatbot Server`);
  console.log(`  Environment : ${NODE_ENV}`);
  console.log(`  Port        : ${PORT}`);
  console.log(`  API Base    : http://localhost:${PORT}/api`);
  console.log(`========================================\n`);
});

// Handle graceful shutdown to release the port immediately on reload or exit
const shutdown = (signal: string) => {
  console.log(`[Server] Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('[Server] HTTP server closed.');
    process.exit(0);
  });
  
  // Force exit after 1 second if connections are keeping the server alive
  setTimeout(() => {
    console.warn('[Server] Forcing shutdown after timeout.');
    process.exit(0);
  }, 1000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Graceful shutdown for nodemon restarts
process.once('SIGUSR2', () => {
  server.close(() => {
    process.kill(process.pid, 'SIGUSR2');
  });
});
