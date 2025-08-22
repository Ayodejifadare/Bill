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
