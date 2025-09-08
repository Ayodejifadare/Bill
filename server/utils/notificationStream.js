import { createClient } from 'redis'

// In-memory map of connected clients keyed by userId
const clients = new Map()

// Heartbeat interval and timeout thresholds (ms)
const HEARTBEAT_INTERVAL = 30_000
const CLIENT_TIMEOUT = 90_000

// Redis pub/sub setup for horizontal scaling
const CHANNEL = 'notifications'
let pub
let sub

if (process.env.REDIS_URL) {
  try {
    pub = createClient({ url: process.env.REDIS_URL })
    sub = createClient({ url: process.env.REDIS_URL })

    pub.on('error', err => console.error('Redis pub error:', err))
    sub.on('error', err => console.error('Redis sub error:', err))

    pub.connect().catch(err => console.error('Redis pub connect error:', err))
    sub
      .connect()
      .then(() =>
        sub.subscribe(CHANNEL, message => {
          try {
            const { userId, data } = JSON.parse(message)
            dispatch(userId, data)
          } catch (err) {
            console.error('Redis message error:', err)
          }
        })
      )
      .catch(err => console.error('Redis sub connect error:', err))
  } catch (err) {
    console.error('Redis init error:', err)
  }
}

function resetTimeout(client) {
  clearTimeout(client.timeout)
  client.timeout = setTimeout(() => {
    removeClient(client.userId)
  }, CLIENT_TIMEOUT)
}

function dispatch(userId, data) {
  const client = clients.get(userId)
  if (!client) return
  try {
    client.res.write(`data: ${JSON.stringify(data)}\n\n`)
    resetTimeout(client)
  } catch (err) {
    removeClient(userId)
  }
}

export function addClient(userId, res) {
  const client = { userId, res }

  res.on('close', () => removeClient(userId))
  res.on('error', () => removeClient(userId))

  client.heartbeat = setInterval(() => {
    try {
      res.write(`event: heartbeat\ndata: ${Date.now()}\n\n`)
      resetTimeout(client)
    } catch (err) {
      removeClient(userId)
    }
  }, HEARTBEAT_INTERVAL)

  resetTimeout(client)
  clients.set(userId, client)
}

export function removeClient(userId) {
  const client = clients.get(userId)
  if (client) {
    clearInterval(client.heartbeat)
    clearTimeout(client.timeout)
    try {
      client.res.end()
    } catch {}
    clients.delete(userId)
  }
}

export async function sendEvent(userId, data) {
  if (pub && pub.isOpen) {
    await pub.publish(CHANNEL, JSON.stringify({ userId, data }))
  } else {
    dispatch(userId, data)
  }
}

