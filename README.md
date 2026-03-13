# Mahangapani — Full-Stack AI News Portal
### Powered by Cysmiq AI · Node.js + Express + SQLite

---

## What This Project Is

Mahangapani is a complete, production-ready news website with:

- **Live news** fetched automatically every hour from NewsAPI
- **AI-generated summaries and Hindi translations** using Claude (Anthropic)
- **User authentication** (JWT-based login/registration)
- **Comment system** with threading and guest commenting
- **Admin dashboard** to manage articles, users, and comments
- **Full-text search** powered by SQLite FTS5
- **Cron job** that auto-fetches news every hour without any manual work

---

## Project Structure

```
mahangapani/
│
├── server.js               ← Main entry point — boots Express + DB + cron
├── package.json
├── .env                    ← Your secrets (copy from .env.example)
│
├── config/
│   └── index.js            ← All runtime config from env vars
│
├── database/
│   └── migrate.js          ← SQLite schema + getDb() singleton
│   └── mahangapani.db      ← Auto-created on first boot (not in git)
│
├── routes/
│   ├── news.js             ← GET/POST/PUT/DELETE /api/v1/news
│   ├── auth.js             ← POST /api/v1/auth/login|register, GET /me
│   ├── comments.js         ← GET/POST/DELETE /api/v1/comments/:articleId
│   └── admin.js            ← /api/v1/admin/* (all require admin role)
│
├── controllers/
│   ├── newsController.js   ← Article CRUD, search, trending, like
│   ├── authController.js   ← Register, login, profile update
│   ├── commentController.js← Threaded comments, approval, likes
│   └── adminController.js  ← Stats, user list, moderation tools
│
├── middleware/
│   ├── auth.js             ← authenticate, requireAdmin, optionalAuth
│   └── validate.js         ← express-validator rule sets
│
├── services/
│   ├── newsApiService.js   ← NewsAPI.org integration + deduplication
│   ├── aiService.js        ← Anthropic Claude: summaries, tags, chat
│   └── cronService.js      ← node-cron hourly scheduler
│
└── public/
    ├── index.html          ← Your original frontend (scripts injected)
    ├── admin.html          ← Admin dashboard
    ├── css/app.css         ← Styles for backend-connected components
    └── js/
        ├── api.js          ← API client (NewsAPI, AuthAPI, CommentsAPI…)
        └── app.js          ← Main frontend logic: renders news, comments
```

---

## Step-by-Step Setup

### Step 1 — Prerequisites

Make sure you have **Node.js 18+** installed.
```bash
node --version   # should print v18.x.x or higher
npm --version
```

### Step 2 — Install Dependencies

```bash
cd mahangapani
npm install
```

This installs Express, better-sqlite3, bcryptjs, jsonwebtoken, node-cron,
axios, and the other packages listed in package.json.

### Step 3 — Configure Environment Variables

```bash
cp .env.example .env
```

Now open `.env` in any text editor and fill in your values:

```
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5000

JWT_SECRET=<generate_a_strong_random_string>

NEWS_API_KEY=<your_newsapi_key>
ANTHROPIC_API_KEY=<your_anthropic_key>

ADMIN_EMAIL=admin@yoursite.com
ADMIN_PASSWORD=YourStrongPassword123!
```

**How to generate JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Step 4 — Get Your API Keys

**NewsAPI (free, 500 requests/day):**
1. Go to https://newsapi.org/register
2. Create a free account
3. Copy your API key into `NEWS_API_KEY`

**Anthropic Claude (AI summaries):**
1. Go to https://console.anthropic.com
2. Create an account and add a payment method
3. Generate an API key and paste it into `ANTHROPIC_API_KEY`

> ℹ️ The app works without Anthropic — articles will be saved without AI summaries, and the chat widget will show a "not configured" message. NewsAPI is strongly recommended so news actually populates on first boot.

### Step 5 — Start the Server

```bash
# Development mode (auto-restarts on file change):
npm run dev

# Production mode:
npm start
```

You should see:
```
✅  Database initialised
✅  Cron jobs started
[Cron] Running initial news fetch on startup…
🚀  Mahangapani is running
    Website  → http://localhost:5000
    API      → http://localhost:5000/api/v1
    Admin    → http://localhost:5000/admin.html
```

### Step 6 — Open the Site

- **Homepage:** http://localhost:5000
- **Admin panel:** http://localhost:5000/admin.html
- **API health:** http://localhost:5000/api/health

Log into the admin panel using the `ADMIN_EMAIL` and `ADMIN_PASSWORD` you set in `.env`.

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default: 5000) |
| `NODE_ENV` | No | `development` or `production` |
| `JWT_SECRET` | **Yes** | Secret key for signing tokens — must be long + random |
| `JWT_EXPIRES_IN` | No | Token expiry (default: `7d`) |
| `NEWS_API_KEY` | **Yes** | Your NewsAPI.org key |
| `NEWS_API_COUNTRY` | No | Country code for headlines (default: `in` = India) |
| `NEWS_API_PAGE_SIZE` | No | Articles per fetch per category (default: 30) |
| `ANTHROPIC_API_KEY` | No | Enables AI summaries and Hindi translations |
| `ADMIN_NAME` | No | Name for auto-created admin (default: Admin) |
| `ADMIN_EMAIL` | **Yes** | Login email for the admin account |
| `ADMIN_PASSWORD` | **Yes** | Admin password — use a strong one! |
| `CRON_SCHEDULE` | No | Cron expression (default: `0 * * * *` = every hour) |
| `DB_PATH` | No | SQLite file path (default: `./database/mahangapani.db`) |

---

## API Reference

### News
```
GET    /api/v1/news                     List articles (paginated)
GET    /api/v1/news?category=sports     Filter by category
GET    /api/v1/news?sort=views          Sort by views/likes/published_at
GET    /api/v1/news/search?q=cricket    Full-text search
GET    /api/v1/news/breaking            Ticker items (latest 10)
GET    /api/v1/news/trending            Top 10 by views (last 7 days)
GET    /api/v1/news/categories          All category rows
GET    /api/v1/news/:slug               Single article + related
POST   /api/v1/news/:id/like            Like an article
POST   /api/v1/news              [ADMIN] Create article
PUT    /api/v1/news/:id          [ADMIN] Update article
DELETE /api/v1/news/:id          [ADMIN] Delete article
POST   /api/v1/news/fetch-now    [ADMIN] Trigger manual NewsAPI fetch
```

### Auth
```
POST   /api/v1/auth/register    Create account → returns { token, user }
POST   /api/v1/auth/login       Login → returns { token, user }
GET    /api/v1/auth/me          Get own profile (requires JWT)
PUT    /api/v1/auth/profile     Update name/bio/avatar (requires JWT)
PUT    /api/v1/auth/password    Change password (requires JWT)
```

### Comments
```
GET    /api/v1/comments/:articleId        Fetch threaded comments
POST   /api/v1/comments/:articleId        Post a comment (guest or user)
DELETE /api/v1/comments/:commentId        Delete own comment (or admin)
POST   /api/v1/comments/:commentId/like   Like a comment
PATCH  /api/v1/comments/:commentId/approve  [ADMIN] Approve / hide
```

### Admin
```
GET    /api/v1/admin/stats          Dashboard numbers
GET    /api/v1/admin/users          Paginated user list
PUT    /api/v1/admin/users/:id      Change role / ban / unban
GET    /api/v1/admin/comments       All comments for moderation
GET    /api/v1/admin/articles       All articles including drafts
```

All admin routes require `Authorization: Bearer <token>` where the token
belongs to a user with `role = 'admin'`.

---

## Deployment Guide

### Option A — Replit (Easiest, free)

1. Create a new **Node.js** Repl at https://replit.com
2. Upload all project files (or connect via GitHub)
3. In the Replit **Secrets** panel, add all your `.env` variables
4. In `.replit` set the run command to `node server.js`
5. Click **Run** — Replit gives you a public URL automatically

> Note: Free Replit projects sleep after 30 minutes of inactivity. Upgrade to Replit Core or use UptimeRobot to keep it awake.

### Option B — Railway (Recommended, $5/month)

1. Push your code to a GitHub repository (make sure `.env` is in `.gitignore`)
2. Go to https://railway.app and create a new project from your GitHub repo
3. In the Railway dashboard → Variables, add all your env variables
4. Railway auto-detects Node.js and runs `npm start`
5. Your site gets a permanent public URL like `mahangapani.railway.app`

### Option C — Render (Free tier available)

1. Push code to GitHub
2. Go to https://render.com → New → Web Service
3. Connect your repo, set build command to `npm install`, start command to `node server.js`
4. Add environment variables in the Render dashboard
5. Deploy

### Option D — VPS (DigitalOcean, Hetzner, etc.)

```bash
# On your server:
git clone https://github.com/yourname/mahangapani.git
cd mahangapani
npm install --production
cp .env.example .env
nano .env          # fill in your values

# Install PM2 to keep the process alive
npm install -g pm2
pm2 start server.js --name mahangapani
pm2 save
pm2 startup        # run the command it prints to auto-start on reboot
```

Then point Nginx at port 5000:
```nginx
server {
    server_name mahangapani.com www.mahangapani.com;
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Run `certbot --nginx` to add free HTTPS.

---

## Common Problems & Solutions

**"No articles on the homepage"**
→ Make sure `NEWS_API_KEY` is set in `.env` and the server started without errors. The initial fetch runs 3 seconds after boot — check your terminal for `[NewsAPI] ✅ Saved` lines.

**"Admin login says invalid credentials"**
→ Make sure `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` match what you type. The admin account is created on the very first boot — if you changed the password in `.env` after the first run, it won't update automatically. Use the database file directly: `sqlite3 database/mahangapani.db "UPDATE users SET password='...' WHERE role='admin';"` (with a bcrypt hash).

**"AI summaries not working"**
→ Check that `ANTHROPIC_API_KEY` is valid and your Anthropic account has credits. The app works fine without it — summaries will just show the raw NewsAPI description.

**Port already in use**
→ Either change `PORT` in `.env`, or kill the conflicting process: `lsof -ti:5000 | xargs kill`.

---

## Tech Stack Summary

| Layer | Technology | Why |
|---|---|---|
| Runtime | Node.js 18 | Fast, widely hosted, JS everywhere |
| Server | Express 4 | Simple, battle-tested HTTP framework |
| Database | SQLite (better-sqlite3) | Zero config, single file, FTS5 built-in |
| Auth | JWT + bcrypt | Stateless tokens, secure password hashing |
| News source | NewsAPI.org | 500 free requests/day, great for India |
| AI | Anthropic Claude Haiku | Fast + cheap for bulk summarization |
| Scheduling | node-cron | Unix cron syntax, timezone-aware |
| Security | helmet + rate-limit + cors | Standard Express security stack |
