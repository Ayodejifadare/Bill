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

const sign = userId => jwt.sign({ userId, tokenVersion: 0 }, process.env.JWT_SECRET)

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
    await prisma.transaction.deleteMany()
    await prisma.billSplitParticipant.deleteMany()
    await prisma.billSplit.deleteMany()
    await prisma.friendship.deleteMany()
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

  it('requires authentication to fetch user stats', async () => {
    const res = await request(app).get('/users/u1/stats')
    expect(res.status).toBe(401)
  })

  it('returns aggregated stats for the user', async () => {
    await prisma.user.createMany({
      data: [
        { id: 'u1', email: 'u1@example.com', name: 'User 1' },
        { id: 'u2', email: 'u2@example.com', name: 'User 2' },
        { id: 'u3', email: 'u3@example.com', name: 'User 3' }
      ]
    })

    await prisma.transaction.createMany({
      data: [
        {
          amount: 50,
          senderId: 'u1',
          receiverId: 'u2',
          type: 'SEND',
          status: 'COMPLETED'
        },
        {
          amount: 30,
          senderId: 'u3',
          receiverId: 'u1',
          type: 'SEND',
          status: 'COMPLETED'
        },
        {
          amount: 20,
          senderId: 'u1',
          receiverId: 'u3',
          type: 'SEND',
          status: 'PENDING'
        }
      ]
    })

    await prisma.billSplit.create({
      data: {
        title: 'Split1',
        totalAmount: 100,
        createdBy: 'u1',
        participants: {
          create: [
            { userId: 'u1', amount: 50 },
            { userId: 'u2', amount: 50 }
          ]
        }
      }
    })

    await prisma.billSplit.create({
      data: {
        title: 'Split2',
        totalAmount: 60,
        createdBy: 'u2',
        participants: {
          create: [
            { userId: 'u1', amount: 30 },
            { userId: 'u2', amount: 30 }
          ]
        }
      }
    })

    await prisma.friendship.createMany({
      data: [
        { user1Id: 'u1', user2Id: 'u2' },
        { user1Id: 'u3', user2Id: 'u1' }
      ]
    })

    const res = await request(app)
      .get('/users/u1/stats')
      .set('Authorization', `Bearer ${sign('u1')}`)

    expect(res.status).toBe(200)
    expect(res.body.stats).toEqual({
      totalSent: 50,
      totalReceived: 30,
      totalSplits: 2,
      friends: 2
    })
  })
})
