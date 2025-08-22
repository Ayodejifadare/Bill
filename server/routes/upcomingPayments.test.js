/**
 * @vitest-environment node
 */
import express from 'express'
import request from 'supertest'
import upcomingPaymentsRouter from './upcomingPayments.js'
import { PrismaClient } from '@prisma/client'
import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest'
import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import jwt from 'jsonwebtoken'

const sign = userId => jwt.sign({ userId, tokenVersion: 0 }, 'your-secret-key')

describe('Upcoming payments route', () => {
  let app
  let prisma
  const dbPath = path.join(__dirname, '..', 'prisma', 'upcoming-payments-test.db')

  beforeAll(() => {
    process.env.DATABASE_URL = `file:${dbPath}`
    execSync('npx prisma migrate deploy', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    })
    prisma = new PrismaClient()
    app = express()
    app.use(express.json())
    app.use((req, res, next) => {
      req.prisma = prisma
      next()
    })
    app.use('/api', upcomingPaymentsRouter)
  })

  beforeEach(async () => {
    await prisma.notification.deleteMany()
    await prisma.transaction.deleteMany()
    await prisma.billSplitParticipant.deleteMany()
    await prisma.billSplit.deleteMany()
    await prisma.paymentMethod.deleteMany()
    await prisma.friendRequest.deleteMany()
    await prisma.friendship.deleteMany()
    await prisma.user.deleteMany()

    const now = new Date()

    await prisma.user.createMany({
      data: [
        { id: 'u1', email: 'u1@example.com', name: 'User One' },
        { id: 'u2', email: 'u2@example.com', name: 'User Two' }
      ]
    })

    // Bill split due soon (3 days)
    await prisma.billSplit.create({
      data: {
        id: 'bs1',
        title: 'Due Soon Split',
        totalAmount: 100,
        createdBy: 'u2',
        date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        participants: {
          create: [
            { userId: 'u1', amount: 50 },
            { userId: 'u2', amount: 50, isPaid: true }
          ]
        }
      }
    })

    // Bill split upcoming (10 days)
    await prisma.billSplit.create({
      data: {
        id: 'bs2',
        title: 'Upcoming Split',
        totalAmount: 60,
        createdBy: 'u2',
        date: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
        participants: {
          create: [
            { userId: 'u1', amount: 60 }
          ]
        }
      }
    })

    // Pending payment request (overdue)
    await prisma.transaction.create({
      data: {
        id: 't1',
        senderId: 'u2',
        receiverId: 'u1',
        amount: 20,
        description: 'Pay back',
        status: 'PENDING',
        type: 'REQUEST',
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
      }
    })

    // Another user's bill split (should not appear)
    await prisma.billSplit.create({
      data: {
        id: 'bs3',
        title: 'Other User Split',
        totalAmount: 80,
        createdBy: 'u2',
        date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        participants: {
          create: [
            { userId: 'u2', amount: 80 }
          ]
        }
      }
    })
  })

  afterAll(async () => {
    await prisma.$disconnect()
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
  })

  it('filters due soon payments', async () => {
    const res = await request(app)
      .get('/api/upcoming-payments')
      .set('Authorization', `Bearer ${sign('u1')}`)
      .query({ filter: 'due_soon' })
      .expect(200)

    expect(res.body.upcomingPayments).toHaveLength(1)
    expect(res.body.upcomingPayments[0].title).toBe('Due Soon Split')
    expect(res.body.upcomingPayments[0].status).toBe('due_soon')
  })

  it('filters pending payments', async () => {
    const res = await request(app)
      .get('/api/upcoming-payments')
      .set('Authorization', `Bearer ${sign('u1')}`)
      .query({ filter: 'pending' })
      .expect(200)

    expect(res.body.upcomingPayments).toHaveLength(1)
    expect(res.body.upcomingPayments[0].requestId).toBe('t1')
    expect(res.body.upcomingPayments[0].status).toBe('pending')
  })

  it('filters upcoming payments', async () => {
    const res = await request(app)
      .get('/api/upcoming-payments')
      .set('Authorization', `Bearer ${sign('u1')}`)
      .query({ filter: 'upcoming' })
      .expect(200)

    expect(res.body.upcomingPayments).toHaveLength(1)
    expect(res.body.upcomingPayments[0].title).toBe('Upcoming Split')
    expect(res.body.upcomingPayments[0].status).toBe('upcoming')
  })
})
