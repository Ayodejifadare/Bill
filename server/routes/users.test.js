/**
 * @vitest-environment node
 */
import express from 'express'
import request from 'supertest'
import usersRouter from './users.js'
import { PrismaClient } from '@prisma/client'
import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest'
import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import jwt from 'jsonwebtoken'

const sign = userId => jwt.sign({ userId, tokenVersion: 0 }, 'your-secret-key')

describe('User routes', () => {
  let app
  let prisma
  const dbPath = path.join(__dirname, '..', 'prisma', 'users-test.db')

  beforeAll(() => {
    process.env.DATABASE_URL = `file:${dbPath}`
    execSync('npx prisma migrate deploy', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    })
    prisma = new PrismaClient()
  })

  beforeEach(async () => {
    await prisma.user.deleteMany()
    app = express()
    app.use(express.json())
    app.use((req, res, next) => {
      req.prisma = prisma
      next()
    })
    app.use('/users', usersRouter)
  })

  afterAll(async () => {
    await prisma.$disconnect()
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
  })

  it('requires authentication to fetch user profile', async () => {
    const res = await request(app).get('/users/u1')
    expect(res.status).toBe(401)
  })

  it('returns user fields including region and currency', async () => {
    await prisma.user.create({ data: { id: 'u1', email: 'u1@example.com', name: 'User 1', region: 'NG', currency: 'NGN' } })

    const res = await request(app)
      .get('/users/u1')
      .set('Authorization', `Bearer ${sign('u1')}`)

    expect(res.status).toBe(200)
    expect(res.body.user).toMatchObject({
      id: 'u1',
      name: 'User 1',
      email: 'u1@example.com',
      phone: null,
      avatar: null,
      preferences: {},
      region: 'NG',
      currency: 'NGN'
    })
  })
})
