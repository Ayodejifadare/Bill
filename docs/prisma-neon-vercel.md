Prisma + Neon on Vercel
=======================

Goal
- Use Neon (Postgres serverless) safely from Vercel Serverless Functions with Prisma.

Key points
- Use Neon pooled connection for runtime to avoid too many connections.
- Use a direct (non-pooled) connection for migrations.
- Do not run Prisma Client on the Edge runtime; keep Node.js.

Environment variables (Vercel → Project Settings → Environment Variables)
- `DATABASE_URL`: Neon pooled connection string (PgBouncer)
  - Example: `postgres://USER:PASSWORD@ep-XXXX-pooler.REGION.aws.neon.tech/DB?sslmode=require`
- `DIRECT_URL`: Neon direct connection string (no `-pooler` in host)
  - Example: `postgres://USER:PASSWORD@ep-XXXX.REGION.aws.neon.tech/DB?sslmode=require`
- Optional (local dev): `SHADOW_DATABASE_URL` for `prisma migrate dev`
- Required app secret: `JWT_SECRET`

Prisma schema
- `server/prisma/schema.prisma` has:

  datasource db {
    provider   = "postgresql"
    url        = env("DATABASE_URL")
    directUrl  = env("DIRECT_URL")
    shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
  }

Migrations on Vercel
- The repo’s `vercel.json` runs: `npm run build && cd server && npx prisma migrate deploy && npx prisma generate`
- Ensure `DIRECT_URL` is set in Vercel so migrations can apply during build.
- If you prefer to run migrations elsewhere (e.g., CI), remove `migrate deploy` from `vercel.json` and execute it in your pipeline.

Runtime notes
- The API runs as a Node.js Serverless Function via `api/[...all].js` and `serverless-http`.
- Prisma Client is instantiated once per process in `server/createApp.js` and reused.
- Keep `sslmode=require`; adding `pgbouncer=true` to `DATABASE_URL` is optional per Neon guidance.

Local development
- Set `DATABASE_URL` (pooled) and optionally `SHADOW_DATABASE_URL` in `server/.env`.
- Run: `cd server && npm run dev` for API and `npm run dev` for frontend.

Troubleshooting
- Too many connections: verify you are using the pooled `DATABASE_URL` in production.
- Migration errors on Vercel: ensure `DIRECT_URL` points to the non-pooled host and exists in the Production env.
- Edge runtime errors: ensure the API is using the Node.js runtime (see `vercel.json` functions config).

