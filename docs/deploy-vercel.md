Deploying Frontend + Express API to Vercel
=========================================

Overview
- Frontend: Vite build output in `dist/`
- API: Express app wrapped as Vercel Serverless Function via `api/[...all].js`

What was added
- `server/createApp.js`: builds the Express app without starting a server. Used by both `server/server.js` (local dev) and serverless handler.
- `api/[...all].js`: catch‑all serverless function using `serverless-http` to run Express on Vercel.
- `vercel.json`: config for build, functions, and SPA rewrites.

Environment variables (Vercel Project Settings → Environment Variables)
- `JWT_SECRET`: required.
- `DATABASE_URL`: required for Prisma.
- `FRONTEND_URL`: your deployed frontend URL (e.g., https://your-app.vercel.app).
- Optional rate limiting knobs: `RATE_LIMIT_ENABLED`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`.
- Optional: `ENABLE_SCHEDULERS=false` (recommended for serverless).

Install/build commands (from vercel.json)
- Install: `npm install && cd server && npm install`
- Build: `npm run build && cd server && npx prisma generate`

Local development
1) Backend: `cd server && npm run dev` (runs Express on localhost:5000)
2) Frontend: `npm run dev` (Vite on localhost:5173 by default)
3) Set `FRONTEND_URL=http://localhost:5173` in server `.env` for CORS in dev.

Notes
- Long‑lived endpoints like Server‑Sent Events (`/api/notifications/stream`) may hit serverless duration limits. Consider moving to Edge Functions or a separate long‑running service for streaming.
- File uploads served from `/uploads` are ephemeral on serverless. Use object storage (S3/GCS) for persistence.

