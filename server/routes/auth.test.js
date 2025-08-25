/**
 * @vitest-environment node
 */
import express from 'express'
import request from 'supertest'
import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

let authRouter

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret'
  authRouter = (await import('./auth.js')).default
})

describe('Auth routes - OTP validation', () => {
  let app

  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.use((req, res, next) => {
      req.prisma = {}
      next()
    })
    app.use('/auth', authRouter)
  })

  it('rejects OTPs that are not 6 digits', async () => {
    const res = await request(app)
      .post('/auth/verify-otp')
      .send({ phone: '+12345678901', otp: '1234' })

    expect(res.status).toBe(400)
    expect(res.body.errors[0]).toMatchObject({
      path: 'otp',
      msg: 'OTP must be exactly 6 digits'
    })
  })

  it('rejects OTPs that contain non-numeric characters', async () => {
    const res = await request(app)
      .post('/auth/verify-otp')
      .send({ phone: '+12345678901', otp: '12a456' })

    expect(res.status).toBe(400)
    expect(res.body.errors[0]).toMatchObject({
      path: 'otp',
      msg: 'OTP must contain only numbers'
    })
  })
})

describe('Auth routes - register', () => {
  let app

  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.use((req, res, next) => {
      req.prisma = {
        user: {
          findUnique: async () => null,
          create: async ({ data }) => ({ ...data, id: 'u1' })
        }
      }
      next()
    })
    app.use('/auth', authRouter)
  })

  it('creates a user and combines first and last name', async () => {
    vi.spyOn(bcrypt, 'hash').mockResolvedValue('hashed')

    const res = await request(app)
      .post('/auth/register')
      .send({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+12345678901',
        password: 'secret123'
      })

    expect(res.status).toBe(201)
    expect(res.body.user).toMatchObject({
      firstName: 'John',
      lastName: 'Doe',
      name: 'John Doe'
    })

    vi.restoreAllMocks()
  })
})

describe('Auth routes - me and logout', () => {
  let app
  let findUnique
  let update
  let token

  const user = {
    id: 'u1',
    email: 'john@example.com',
    name: 'John Doe',
    balance: 0,
    avatar: null,
    createdAt: new Date('2023-01-01'),
    tokenVersion: 1,
    phoneVerified: true,
    emailVerified: true,
    idVerified: false,
    documentsSubmitted: false,
    onboardingCompleted: false
  }

  beforeEach(() => {
    findUnique = vi.fn(async () => ({ ...user }))
    update = vi.fn(async () => ({}))

    token = jwt.sign({ userId: user.id, tokenVersion: user.tokenVersion }, process.env.JWT_SECRET)

    app = express()
    app.use(express.json())
    app.use((req, res, next) => {
      req.prisma = {
        user: {
          findUnique,
          update
        }
      }
      next()
    })
    app.use('/auth', authRouter)
  })

  it('returns current user with valid token', async () => {
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.user).toMatchObject({ id: user.id })
    expect(findUnique).toHaveBeenCalled()
  })

  it('responds with 401 when no token provided for /me', async () => {
    const res = await request(app).get('/auth/me')

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'No token provided' })
  })

  it('logs out user with valid token', async () => {
    const res = await request(app)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ message: 'Logged out' })
    expect(update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { tokenVersion: { increment: 1 } }
    })
  })

  it('responds with 401 when no token provided for /logout', async () => {
    const res = await request(app).post('/auth/logout')

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'No token provided' })
  })
})

