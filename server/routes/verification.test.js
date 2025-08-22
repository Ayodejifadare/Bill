/**
 * @vitest-environment node
 */
import express from 'express'
import request from 'supertest'
import verificationRouter from './verification.js'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest'
import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'

describe('Verification routes', () => {
  let app
  let prisma
  let token
  const dbPath = path.join(__dirname, '..', 'prisma', 'test.db')

  beforeAll(() => {
    process.env.DATABASE_URL = `file:${dbPath}`
    execSync('npx prisma migrate deploy', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    })
    execSync('npx prisma generate', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    })
    prisma = new PrismaClient()
  })

  beforeEach(async () => {
    await prisma.user.deleteMany()
    await prisma.user.create({
      data: { id: 'u1', email: 'u1@example.com', name: 'User 1', tokenVersion: 0 }
    })
    token = jwt.sign({ userId: 'u1', tokenVersion: 0 }, process.env.JWT_SECRET || 'your-secret-key')

    app = express()
    app.use(express.json())
    app.use((req, res, next) => { req.prisma = prisma; next() })
    app.use('/api/verification', verificationRouter)
  })

  afterAll(async () => {
    await prisma.$disconnect()
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
  })

  it('verifies phone and updates status', async () => {
    const sendRes = await request(app)
      .post('/api/verification/phone')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '+1234567890' })
    expect(sendRes.status).toBe(200)
    expect(sendRes.body.verification.phoneVerified).toBe(false)

    const codeEntry = await prisma.verificationCode.findFirst({
      where: { userId: 'u1', type: 'phone' }
    })

    const verifyRes = await request(app)
      .post('/api/verification/phone')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '+1234567890', code: codeEntry.code })
    expect(verifyRes.status).toBe(200)
    expect(verifyRes.body.verification.phoneVerified).toBe(true)
  })

  it('resends phone verification code and enforces rate limiting', async () => {
    await request(app)
      .post('/api/verification/phone')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '+1234567890' })

    const firstEntry = await prisma.verificationCode.findFirst({
      where: { userId: 'u1', type: 'phone' }
    })

    const resendRes = await request(app)
      .post('/api/verification/phone/resend')
      .set('Authorization', `Bearer ${token}`)
      .send({})
    expect(resendRes.status).toBe(200)

    const secondEntry = await prisma.verificationCode.findFirst({
      where: { userId: 'u1', type: 'phone' }
    })
    expect(secondEntry.code).not.toBe(firstEntry.code)

    await request(app)
      .post('/api/verification/phone/resend')
      .set('Authorization', `Bearer ${token}`)
      .send({})
    await request(app)
      .post('/api/verification/phone/resend')
      .set('Authorization', `Bearer ${token}`)
      .send({})
    const limitRes = await request(app)
      .post('/api/verification/phone/resend')
      .set('Authorization', `Bearer ${token}`)
      .send({})
    expect(limitRes.status).toBe(429)
  })

  it('marks ID and documents as submitted', async () => {
    const idRes = await request(app)
      .post('/api/verification/id')
      .set('Authorization', `Bearer ${token}`)
      .send({})
    expect(idRes.status).toBe(200)
    expect(idRes.body.verification.idVerified).toBe(true)

    const docRes = await request(app)
      .post('/api/verification/documents')
      .set('Authorization', `Bearer ${token}`)
      .send({})
    expect(docRes.status).toBe(200)
    expect(docRes.body.verification.documentsSubmitted).toBe(true)
  })
})
