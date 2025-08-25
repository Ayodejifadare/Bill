/**
 * @vitest-environment node
 */
import express from 'express'
import request from 'supertest'
import { describe, it, expect, beforeEach, beforeAll } from 'vitest'

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

