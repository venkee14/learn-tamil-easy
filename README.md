# LearnTamilEasy

A browser-based education platform that helps children (ages 4–14) learn Tamil through structured, interactive lessons — letters, pronunciation, vocabulary, stories, and songs.

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + TanStack Query
- **Backend**: Node.js + Hono + TypeScript
- **Database**: MongoDB + Mongoose
- **Media**: Audio/images downloaded at seed time (Google Translate TTS + Wikimedia); served from local disk in dev, Cloudflare R2 in prod

## Prerequisites

- **Node.js ≥ 20** (backend requires this; repo has been run on Node 26)
- **npm** (this is an npm workspaces monorepo — `frontend/` and `backend/` are the two workspaces)
- **MongoDB**, running locally. On macOS:
  ```bash
  brew tap mongodb/brew
  brew install mongodb-community
  brew services start mongodb-community
  ```
- **Git**

No Cloudflare R2 account, AWS credentials, or admin auth provider are required for local development — the backend automatically falls back to local filesystem storage (`backend/uploads/`) when R2 credentials aren't set.

## Setup

1. **Clone and install dependencies** (one `npm install` at the repo root installs both workspaces):
   ```bash
   git clone https://github.com/venkee14/learn-tamil-easy.git
   cd learn-tamil-easy
   npm install
   ```

   > If `vite` fails to start with `Cannot find module '@rollup/rollup-darwin-arm64'`, this is a known npm/optional-dependencies bug (npm/cli#4828). Fix with a clean reinstall:
   > ```bash
   > rm -rf node_modules package-lock.json frontend/node_modules backend/node_modules
   > npm install
   > ```

2. **Create local env files.**

   `backend/.env`:
   ```
   MONGODB_URI=mongodb://localhost:27017/learntamileasy
   PORT=3001
   BASE_URL=http://localhost:3001
   FRONTEND_URL=http://localhost:5173
   ADMIN_PASSWORD=<pick anything for local dev>
   ```

   `frontend/.env`:
   ```
   VITE_API_URL=http://localhost:3001
   ```

   (`backend/.env.example` and `frontend/.env.example` document the full set of variables, including the R2 credentials used in production.)

3. **Seed the database.** All lesson content (letters, words, stories, songs) is defined as TypeScript constants in `backend/src/seed.ts` and written to MongoDB by this script — it also downloads the associated audio/image assets, so first run takes a few minutes:
   ```bash
   cd backend
   npm run seed
   ```

4. **Run the app** (two terminals):
   ```bash
   # Backend — http://localhost:3001
   cd backend && npm run dev

   # Frontend — http://localhost:5173
   cd frontend && npm run dev
   ```

5. Open `http://localhost:5173` in a browser.

## Re-seeding

Re-run `npm run seed` from `backend/` any time content in `seed.ts` changes. The script skips re-downloading audio/images that already exist on disk — if you change lyrics or text for an existing entry without changing its filename, delete the stale file from `backend/uploads/` first.

## Project structure

```
learn-tamil-easy/
  backend/
    src/
      seed.ts              ← all lesson content lives here
      index.ts             ← Hono server entry point
      db.ts                ← MongoDB connection
      models/              ← Mongoose schemas
      routes/               ← public, admin, and upload routes
      middleware/adminAuth.ts
    uploads/                ← downloaded audio/images (git-ignored)
  frontend/
    src/
      pages/
      components/
      hooks/
      api/
```

Content hierarchy: `Language → Grade → Unit → Chapter → Section → ContentBlock`.

## Production

- Frontend: Cloudflare Pages — auto-deploys from `main`
- Backend: Railway — auto-deploys from `main`
- Database: MongoDB Atlas

Production seeding (`npm run seed:prod` in `backend/`) requires `backend/.env.production` and should only be run *after* a backend push has finished deploying to Railway, since seeded URLs point at the live Railway host.
