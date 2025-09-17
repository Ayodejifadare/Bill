/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { EventEmitter } from 'events'

const HEARTBEAT_INTERVAL = 30_000
const CHANNEL = 'notifications'
const ORIGINAL_REDIS_URL = process.env.REDIS_URL

function createMockResponse() {
  const res = new EventEmitter()
  res.write = vi.fn()
  res.end = vi.fn()
  return res
}

function createMockRedisClient() {
  const client = new EventEmitter()
  client.isOpen = false
  client.connect = vi.fn(async () => {
    client.isOpen = true
  })
  client.publish = vi.fn(async () => {})
  client.subscribe = vi.fn(async (channel, handler) => {
    client.subscription = handler
  })
  return client
}

async function loadNotificationStream({ enableRedis = false } = {}) {
  vi.resetModules()
  const mockPub = createMockRedisClient()
  const mockSub = createMockRedisClient()
  const redisClients = [mockPub, mockSub]
  const createClient = vi.fn(() =>
    enableRedis ? redisClients.shift() ?? createMockRedisClient() : createMockRedisClient()
  )

  vi.doMock('redis', () => ({
    createClient,
  }))

  if (enableRedis) {
    process.env.REDIS_URL = 'redis://test'
  } else {
    delete process.env.REDIS_URL
  }

  const stream = await import('./notificationStream.js')
  return { stream, mockPub, mockSub, createClient }
}

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.clearAllMocks()
  vi.resetModules()
  if (ORIGINAL_REDIS_URL === undefined) {
    delete process.env.REDIS_URL
  } else {
    process.env.REDIS_URL = ORIGINAL_REDIS_URL
  }
})

describe('notificationStream without redis', () => {
  it('stores clients and sends heartbeat messages', async () => {
    const { stream } = await loadNotificationStream()
    vi.useFakeTimers()

    const res = createMockResponse()
    stream.addClient('user-1', res)

    const payload = { message: 'hello' }
    await stream.sendEvent('user-1', payload)

    const [initialChunk] = res.write.mock.calls[0]
    expect(initialChunk.startsWith('data: ')).toBe(true)
    expect(initialChunk).toContain(JSON.stringify(payload))
    expect(initialChunk.endsWith('\n\n') || initialChunk.endsWith('\\n\\n')).toBe(true)

    res.write.mockClear()
    vi.advanceTimersByTime(HEARTBEAT_INTERVAL)

    expect(res.write).toHaveBeenCalledTimes(1)
    expect(res.write.mock.calls[0][0]).toMatch(/^event: heartbeat/)

    stream.removeClient('user-1')
  })

  it('removes clients, clears timers, and ends responses', async () => {
    const { stream } = await loadNotificationStream()
    vi.useFakeTimers()

    const res = createMockResponse()
    stream.addClient('user-2', res)

    expect(vi.getTimerCount()).toBeGreaterThan(0)

    stream.removeClient('user-2')

    expect(res.end).toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)

    res.write.mockClear()
    vi.advanceTimersByTime(HEARTBEAT_INTERVAL * 4)
    expect(res.write).not.toHaveBeenCalled()
  })

  it('sends events directly when redis is not configured', async () => {
    const { stream } = await loadNotificationStream()
    vi.useFakeTimers()

    const res = createMockResponse()
    stream.addClient('user-3', res)

    const payload = { alert: 'update' }
    await stream.sendEvent('user-3', payload)

    const [chunk] = res.write.mock.calls[0]
    expect(chunk.startsWith('data: ')).toBe(true)
    expect(chunk).toContain(JSON.stringify(payload))
    expect(chunk.endsWith('\n\n') || chunk.endsWith('\\n\\n')).toBe(true)

    stream.removeClient('user-3')
  })

  it('removes the client when response.write throws', async () => {
    const { stream } = await loadNotificationStream()
    vi.useFakeTimers()

    const res = createMockResponse()
    res.write.mockImplementation(() => {
      throw new Error('write failed')
    })

    stream.addClient('user-4', res)
    const timersBefore = vi.getTimerCount()
    expect(timersBefore).toBeGreaterThan(0)

    await expect(stream.sendEvent('user-4', { msg: 'boom' })).resolves.toBeUndefined()

    expect(res.end).toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)

    res.write.mockClear()
    await stream.sendEvent('user-4', { msg: 'second' })
    expect(res.write).not.toHaveBeenCalled()
  })
})

describe('notificationStream with redis', () => {
  it('publishes events through redis when configured', async () => {
    const { stream, mockPub } = await loadNotificationStream({ enableRedis: true })

    await stream.sendEvent('user-5', { ping: true })

    expect(mockPub.publish).toHaveBeenCalledWith(
      CHANNEL,
      JSON.stringify({ userId: 'user-5', data: { ping: true } })
    )
  })
})
