"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./routes/auth"));
const pages_1 = __importDefault(require("./routes/pages"));
const webhook_1 = __importDefault(require("./routes/webhook"));
const customers_1 = __importDefault(require("./routes/customers"));
const admin_1 = __importDefault(require("./routes/admin"));
const usage_1 = __importDefault(require("./routes/usage"));
const aiConfig_1 = __importDefault(require("./routes/aiConfig"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', environment: NODE_ENV, timestamp: new Date() });
});
// API Routes
app.use('/api/auth', auth_1.default);
app.use('/api/pages', pages_1.default);
app.use('/api/customers', customers_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/usage', usage_1.default);
app.use('/api/admin/ai-config', aiConfig_1.default);
app.use('/webhook/facebook', webhook_1.default);
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
if (NODE_ENV === 'production') {
    const frontendPath = path_1.default.resolve(__dirname, 'frontend', 'public');
    if (fs_1.default.existsSync(frontendPath)) {
        console.log(`[Server] Serving frontend from ${frontendPath}`);
        // 1. Serve static assets (JS, CSS, fonts, images, etc.)
        app.use(express_1.default.static(frontendPath, {
            // Cache static assets for 1 year (fingerprinted filenames)
            maxAge: '1y',
            immutable: true,
        }));
        // 2. SPA fallback: return index.html for any non-API request
        //    (lets Vue Router handle client-side routing)
        app.use('*', (req, res, next) => {
            // Let API/webhook routes pass through (they'll 404 normally)
            if (req.path.startsWith('/api') ||
                req.path.startsWith('/webhook') ||
                req.path === '/health') {
                return next();
            }
            res.sendFile(path_1.default.join(frontendPath, 'index.html'), (err) => {
                if (err) {
                    console.error('[Server] Failed to serve index.html:', err.message);
                    res.status(500).json({ error: 'Internal server error' });
                }
            });
        });
        console.log(`[Server] Frontend bundled. Access the app at http://localhost:${PORT}`);
    }
    else {
        console.warn(`[Server] WARNING: Frontend build not found at ${frontendPath}`);
        console.warn(`[Server] Run 'npm run build' first to generate the full build.`);
        console.warn(`[Server] Express will serve API only on port ${PORT}.`);
    }
}
else {
    console.log(`[Server] Development mode: frontend runs separately on its own dev server.`);
}
// Start Server
app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`  Facebook AI Chatbot Server`);
    console.log(`  Environment : ${NODE_ENV}`);
    console.log(`  Port        : ${PORT}`);
    console.log(`  API Base    : http://localhost:${PORT}/api`);
    console.log(`========================================\n`);
});
//# sourceMappingURL=index.js.map