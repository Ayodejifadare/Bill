# Notification Stream

## `GET /api/notifications/unread`
Returns the number of unread notifications for the authenticated user.

```json
{ "count": 0 }
```

## `GET /api/notifications/stream`
Server‑Sent Events endpoint that pushes updates whenever the unread count changes.

### Authentication
Include a JWT in the `Authorization` header (`Bearer <token>`). The connection will be closed if the token is missing or invalid.

### Reconnection strategy
Clients should automatically reconnect if the stream closes. Use an exponential backoff starting at 1 second and doubling on each attempt up to 30 seconds. Apply a small random jitter to avoid thundering herds. Reset the delay after a successful connection.
