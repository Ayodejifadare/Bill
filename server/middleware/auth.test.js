/**
 * @vitest-environment node
 */
import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from 'vitest'

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn()
  }
}))

let authenticate
let jwt

const originalEnv = {
  JWT_SECRET: process.env.JWT_SECRET,
  ALLOW_HEADER_AUTH: process.env.ALLOW_HEADER_AUTH,
  NODE_ENV: process.env.NODE_ENV
}

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret'
  jwt = (await import('jsonwebtoken')).default
  authenticate = (await import('./auth.js')).default
})

afterAll(() => {
  if (originalEnv.JWT_SECRET === undefined) {
    delete process.env.JWT_SECRET
  } else {
    process.env.JWT_SECRET = originalEnv.JWT_SECRET
  }

  if (originalEnv.ALLOW_HEADER_AUTH === undefined) {
    delete process.env.ALLOW_HEADER_AUTH
  } else {
    process.env.ALLOW_HEADER_AUTH = originalEnv.ALLOW_HEADER_AUTH
  }

  if (originalEnv.NODE_ENV === undefined) {
    delete process.env.NODE_ENV
  } else {
    process.env.NODE_ENV = originalEnv.NODE_ENV
  }
})

beforeEach(() => {
  vi.clearAllMocks()
  if (jwt?.verify?.mockReset) {
    jwt.verify.mockReset()
  }
  process.env.ALLOW_HEADER_AUTH = 'false'
  process.env.NODE_ENV = 'test'
})

function createContext({ authorization, userId } = {}) {
  const headers = {}
  if (authorization !== undefined) {
    headers.authorization = authorization
  }
  if (userId !== undefined) {
    headers['x-user-id'] = userId
  }

  const req = {
    headers,
    prisma: {
      user: {
        findUnique: vi.fn()
      }
    }
  }

  const res = {
    status: vi.fn(),
    json: vi.fn()
  }
  res.status.mockImplementation(() => res)

  const next = vi.fn()

  return { req, res, next, findUnique: req.prisma.user.findUnique }
}

describe('authenticate middleware', () => {
  it('authenticates valid bearer tokens', async () => {
    const { req, res, next, findUnique } = createContext({
      authorization: 'Bearer header.payload.signature'
    })

    jwt.verify.mockReturnValue({ userId: 'user-1', tokenVersion: 3 })
    findUnique.mockResolvedValue({ tokenVersion: 3 })

    await authenticate(req, res, next)

    expect(jwt.verify).toHaveBeenCalledWith('header.payload.signature', 'test-secret')
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { tokenVersion: true }
    })
    expect(req.user).toEqual({ id: 'user-1' })
    expect(req.userId).toBe('user-1')
    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
    expect(res.json).not.toHaveBeenCalled()
  })

  it('returns 401 when the authorization header is missing', async () => {
    const { req, res, next, findUnique } = createContext()

    await authenticate(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' })
    expect(next).not.toHaveBeenCalled()
    expect(findUnique).not.toHaveBeenCalled()
    expect(jwt.verify).not.toHaveBeenCalled()
  })

  it('returns 401 for malformed authorization headers', async () => {
    const { req, res, next, findUnique } = createContext({
      authorization: 'Basic sometoken'
    })

    await authenticate(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Malformed authorization header' })
    expect(next).not.toHaveBeenCalled()
    expect(findUnique).not.toHaveBeenCalled()
    expect(jwt.verify).not.toHaveBeenCalled()
  })

  it('returns 401 for malformed tokens', async () => {
    const { req, res, next, findUnique } = createContext({
      authorization: 'Bearer invalidtoken'
    })

    await authenticate(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Malformed token' })
    expect(next).not.toHaveBeenCalled()
    expect(findUnique).not.toHaveBeenCalled()
    expect(jwt.verify).not.toHaveBeenCalled()
  })

  it('returns 401 when the user cannot be found for a decoded token', async () => {
    const { req, res, next, findUnique } = createContext({
      authorization: 'Bearer a.b.c'
    })

    jwt.verify.mockReturnValue({ userId: 'user-404', tokenVersion: 1 })
    findUnique.mockResolvedValue(null)

    await authenticate(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' })
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when the token version does not match', async () => {
    const { req, res, next, findUnique } = createContext({
      authorization: 'Bearer a.b.c'
    })

    jwt.verify.mockReturnValue({ userId: 'user-1', tokenVersion: 2 })
    findUnique.mockResolvedValue({ tokenVersion: 3 })

    await authenticate(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' })
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 for invalid signatures', async () => {
    const { req, res, next, findUnique } = createContext({
      authorization: 'Bearer a.b.c'
    })

    jwt.verify.mockImplementation(() => {
      const err = new Error('invalid signature')
      err.name = 'JsonWebTokenError'
      throw err
    })

    await authenticate(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid signature' })
    expect(next).not.toHaveBeenCalled()
    expect(findUnique).not.toHaveBeenCalled()
  })

  it('bypasses JWT verification when ALLOW_HEADER_AUTH is true and x-user-id header is present', async () => {
    process.env.ALLOW_HEADER_AUTH = 'true'
    const { req, res, next, findUnique } = createContext({ userId: 'header-user' })

    await authenticate(req, res, next)

    expect(req.user).toEqual({ id: 'header-user' })
    expect(req.userId).toBe('header-user')
    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
    expect(jwt.verify).not.toHaveBeenCalled()
    expect(findUnique).not.toHaveBeenCalled()
  })

  it('bypasses JWT verification when running in development mode with x-user-id header', async () => {
    process.env.NODE_ENV = 'development'
    const { req, res, next, findUnique } = createContext({ userId: 'dev-user' })

    await authenticate(req, res, next)

    expect(req.user).toEqual({ id: 'dev-user' })
    expect(req.userId).toBe('dev-user')
    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
    expect(jwt.verify).not.toHaveBeenCalled()
    expect(findUnique).not.toHaveBeenCalled()
  })
})
