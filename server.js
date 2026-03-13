/**
 * server.js — Mahangapani Main Application
 * Cysmiq AI · Full-Stack News Portal
 * ─────────────────────────────────────────
 * This is the entry point Node.js runs with `node server.js`.
 * It wires together all middleware, routes, and services,
 * then starts listening on the configured port.
 *
 * Boot sequence:
 *   1. Load env vars from .env
 *   2. Create Express app + attach middleware
 *   3. Mount API route modules at /api/v1/*
 *   4. Serve static frontend files from /public
 *   5. Run database migration (creates tables if missing)
 *   6. Start cron job for hourly news fetching
 *   7. Listen for connections
 */

require('dotenv').config();

const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const morgan      = require('morgan');
const compression = require('compression');
const path        = require('path');
const rateLimit   = require('express-rate-limit');

const config            = require('./config');
const { initDatabase }  = require('./database/migrate');
const { startCronJobs } = require('./services/cronService');

// Route modules
const newsRoutes    = require('./routes/news');
const authRoutes    = require('./routes/auth');
const commentRoutes = require('./routes/comments');
const adminRoutes   = require('./routes/admin');

const app = express();

// ── Security middleware ───────────────────────────────────────────────────────
// helmet sets a battery of secure HTTP response headers automatically.
// We disable contentSecurityPolicy here so that our Google Fonts CDN
// links and Unsplash images in the frontend load without being blocked.
app.use(helmet({ contentSecurityPolicy: false }));

// CORS lets the frontend (if running on a different port/domain) talk to the API.
// In production set FRONTEND_URL in .env to your exact domain.
app.use(cors({ origin: config.frontendUrl, credentials: true }));

// ── General middleware ────────────────────────────────────────────────────────
app.use(compression());                          // gzip all responses
app.use(morgan(config.isDev ? 'dev' : 'combined')); // request logging
app.use(express.json({ limit: '10mb' }));        // parse JSON request bodies
app.use(express.urlencoded({ extended: true }));  // parse form-encoded bodies

// ── Rate limiting ─────────────────────────────────────────────────────────────
// A broad limiter for all API traffic prevents DoS and runaway crawlers.
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please try again in a few minutes.' },
}));

// Stricter limiter for auth endpoints to slow down brute-force attacks.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts — please wait 15 minutes.' },
});

// ── Static files ──────────────────────────────────────────────────────────────
// Serve the frontend (HTML, CSS, JS) from the /public folder.
// This means a single `node server.js` command serves both the
// API and the website — no separate frontend server needed.
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded images from /uploads at the URL /uploads/*
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/v1/news',     newsRoutes);
app.use('/api/v1/auth',     authLimiter, authRoutes);
app.use('/api/v1/comments', commentRoutes);
app.use('/api/v1/admin',    adminRoutes);

// Health check — handy for deployment platforms (Railway, Render, etc.)
// to verify the service is alive without needing auth.
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Mahangapani · Cysmiq AI',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    env: config.nodeEnv,
  });
});

// ── SPA fallback ──────────────────────────────────────────────────────────────
// Any request that didn't match a static file or API route gets
// index.html, so the frontend's client-side router takes over.
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Global error handler ──────────────────────────────────────────────────────
// Express calls this whenever next(err) is called in any controller.
// Keeping error handling in one place means consistent JSON error shapes.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.stack || err.message);
  res.status(err.status || 500).json({
    error: err.message || 'An unexpected error occurred.',
    // Only expose stack traces in development — never in production
    ...(config.isDev && { stack: err.stack }),
  });
});

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function bootstrap() {
  try {
    // Step 1: Ensure the database schema exists
    initDatabase();
    console.log('✅  Database initialised');

    // Step 2: Start the hourly news-fetching cron job
    startCronJobs();
    console.log('✅  Cron jobs started');

    // Step 3: Start accepting connections
    app.listen(config.port, () => {
      console.log(`\n🚀  Mahangapani is running`);
      console.log(`    Website  → http://localhost:${config.port}`);
      console.log(`    API      → http://localhost:${config.port}/api/v1`);
      console.log(`    Admin    → http://localhost:${config.port}/admin.html`);
      console.log(`    Health   → http://localhost:${config.port}/api/health`);
      console.log(`    Env      → ${config.nodeEnv}\n`);
    });
  } catch (err) {
    console.error('❌  Server failed to start:', err.message);
    process.exit(1);
  }
}

bootstrap();
