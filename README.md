# Bill

This project uses Vite and TypeScript. API calls can be routed either to mock handlers or to a real backend depending on environment configuration.

## Configuration

Create a `.env` file in the project root with the following variables:

```bash
# Use local mock data instead of real API calls
VITE_USE_MOCK_API=true

# Base URL for real API requests
VITE_API_BASE_URL=/api
```

Set `VITE_USE_MOCK_API` to `false` and change `VITE_API_BASE_URL` to your backend URL when integrating with a server:

```bash
VITE_USE_MOCK_API=false
VITE_API_BASE_URL=https://api.example.com
```

## Running

### Mock mode

```
VITE_USE_MOCK_API=true npm run dev
```

### Real API mode

```
VITE_USE_MOCK_API=false VITE_API_BASE_URL=https://api.example.com npm run dev
```

The `apiClient` utility reads these variables to determine whether to use mock modules or prepend the configured base URL for network requests.

## User Registration

When calling the `/api/auth/register` endpoint, clients should provide `firstName` and `lastName` fields. The server automatically combines these into a single `name` value, so there is no need to send a separate `name` field in the request body.

## Backend Seeding Policy

- Seeding is disabled in production by default to avoid demo/test data in live environments.
- To seed locally or in staging, run `npm run db:seed` from `server/`.
- In production, seeding will no-op unless you explicitly set `ALLOW_SEED_PROD=1`.
- File of interest: `server/scripts/seed.js` (contains the production guard).
- To clean demo/seed users, use: `server/scripts/cleanupDemoUsers.js` (dry-run by default; set `CONFIRM=1`).
