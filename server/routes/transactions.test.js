/**
 * @vitest-environment node
 */
import express from 'express'
import request from 'supertest'
import transactionsRouter from './transactions.js'
import { PrismaClient } from '@prisma/client'
import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest'
import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import jwt from 'jsonwebtoken'

const sign = userId => jwt.sign({ userId, tokenVersion: 0 }, process.env.JWT_SECRET)

describe('Transaction routes', () => {
  let app
  let prisma
  const dbPath = path.join(__dirname, '..', 'prisma', 'transactions-test.db')

  beforeAll(() => {
    process.env.DATABASE_URL = `file:${dbPath}`
    execSync('npx prisma migrate deploy', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    })
    prisma = new PrismaClient()
  })

  beforeEach(async () => {
    await prisma.notification.deleteMany()
    await prisma.notificationPreference.deleteMany()
    await prisma.transaction.deleteMany()
    await prisma.billSplitParticipant.deleteMany()
    await prisma.billSplit.deleteMany()
    await prisma.friendRequest.deleteMany()
    await prisma.friendship.deleteMany()
    await prisma.paymentMethod.deleteMany()
    await prisma.groupAccount.deleteMany()
    await prisma.groupMember.deleteMany()
    await prisma.group.deleteMany()
    await prisma.user.deleteMany()

    app = express()
    app.use(express.json())
    app.use((req, res, next) => {
      req.prisma = prisma
      next()
    })
    app.use('/transactions', transactionsRouter)
  })

  afterAll(async () => {
    await prisma.$disconnect()
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
  })

  it('retrieves a transaction by id with bill split and payment method', async () => {
    await prisma.user.create({ data: { id: 'u1', email: 'u1@example.com', name: 'User 1' } })
    await prisma.user.create({ data: { id: 'u2', email: 'u2@example.com', name: 'User 2' } })

    const pm = await prisma.paymentMethod.create({
      data: {
        id: 'pm1',
        type: 'bank',
        bank: 'Bank',
        accountNumber: '123',
        accountName: 'User 1',
        userId: 'u1'
      }
    })

    const bs = await prisma.billSplit.create({
      data: {
        id: 'bs1',
        title: 'Dinner',
        totalAmount: 100,
        createdBy: 'u1',
        location: 'Restaurant',
        note: 'Fun night',
        paymentMethodId: pm.id,
        participants: {
          create: [
            { userId: 'u1', amount: 50, isPaid: true },
            { userId: 'u2', amount: 50, isPaid: false }
          ]
        }
      }
    })

    const tx = await prisma.transaction.create({
      data: {
        id: 't1',
        amount: 50,
        senderId: 'u1',
        receiverId: 'u2',
        type: 'BILL_SPLIT',
        status: 'COMPLETED',
        billSplitId: bs.id,
        category: 'FOOD'
      }
    })

    const res = await request(app)
      .get(`/transactions/${tx.id}`)
      .set('Authorization', `Bearer ${sign('u1')}`)
      .send()

    expect(res.status).toBe(200)
    expect(res.body.transaction.id).toBe(tx.id)
    expect(res.body.transaction.sender.id).toBe('u1')
    expect(res.body.transaction.recipient.id).toBe('u2')
    expect(res.body.transaction.paymentMethod).toMatchObject({ type: 'bank', bankName: 'Bank' })
    expect(res.body.transaction.totalParticipants).toBe(2)
    expect(res.body.transaction.paidParticipants).toBe(1)
    expect(res.body.transaction.category).toBe('food')
  })

  it('lists transactions with recipient and date fields', async () => {
    await prisma.user.create({ data: { id: 'u1', email: 'u1@example.com', name: 'User 1' } })
    await prisma.user.create({ data: { id: 'u2', email: 'u2@example.com', name: 'User 2' } })

    const tx = await prisma.transaction.create({
      data: {
        id: 't-list',
        amount: 20,
        senderId: 'u1',
        receiverId: 'u2',
        type: 'SEND',
        status: 'COMPLETED'
      }
    })

    const res = await request(app)
      .get('/transactions')
      .set('Authorization', `Bearer ${sign('u1')}`)
      .send()

    expect(res.status).toBe(200)
    expect(res.body.transactions).toHaveLength(1)
    const item = res.body.transactions[0]
    expect(item.recipient.id).toBe('u2')
    expect(item).not.toHaveProperty('receiver')
    expect(item.date).toBe(tx.createdAt.toISOString())
    expect(item).not.toHaveProperty('createdAt')
  })

  it('includes summary totals when includeSummary flag is set', async () => {
    await prisma.user.createMany({
      data: [
        { id: 'u1', email: 'u1@example.com', name: 'User 1' },
        { id: 'u2', email: 'u2@example.com', name: 'User 2' }
      ]
    })

    await prisma.transaction.createMany({
      data: [
        {
          id: 's1',
          amount: 20,
          senderId: 'u1',
          receiverId: 'u2',
          type: 'SEND',
          status: 'COMPLETED'
        },
        {
          id: 'r1',
          amount: 30,
          senderId: 'u2',
          receiverId: 'u1',
          type: 'SEND',
          status: 'COMPLETED'
        }
      ]
    })

    const res = await request(app)
      .get('/transactions')
      .query({ includeSummary: 'true' })
      .set('Authorization', `Bearer ${sign('u1')}`)
      .send()

    expect(res.status).toBe(200)
    expect(res.body.totalSent).toBe(20)
    expect(res.body.totalReceived).toBe(30)
    expect(res.body.netFlow).toBe(10)
  })

  it('filters transactions by date range', async () => {
    await prisma.user.createMany({
      data: [
        { id: 'u1', email: 'u1@example.com', name: 'User 1' },
        { id: 'u2', email: 'u2@example.com', name: 'User 2' }
      ]
    })

    await prisma.transaction.createMany({
      data: [
        {
          id: 'd1',
          amount: 10,
          senderId: 'u1',
          receiverId: 'u2',
          type: 'SEND',
          status: 'COMPLETED',
          category: 'FOOD',
          createdAt: new Date('2024-01-01')
        },
        {
          id: 'd2',
          amount: 20,
          senderId: 'u1',
          receiverId: 'u2',
          type: 'SEND',
          status: 'COMPLETED',
          category: 'RENT',
          createdAt: new Date('2024-02-01')
        },
        {
          id: 'd3',
          amount: 30,
          senderId: 'u1',
          receiverId: 'u2',
          type: 'SEND',
          status: 'COMPLETED',
          category: 'UTILITIES',
          createdAt: new Date('2024-03-01')
        }
      ]
    })

    const res = await request(app)
      .get('/transactions')
      .query({ startDate: '2024-02-01', endDate: '2024-03-01' })
      .set('Authorization', `Bearer ${sign('u1')}`)
      .send()

    expect(res.status).toBe(200)
    expect(res.body.transactions).toHaveLength(2)
    const ids = res.body.transactions.map(t => t.id)
    expect(ids).toEqual(['d3', 'd2'])
    expect(res.body.transactions[0]).toMatchObject({
      recipient: { id: 'u2' },
      category: 'utilities'
    })
    expect(res.body.transactions[0]).toHaveProperty('date')
    expect(res.body.total).toBe(2)
    expect(res.body.pageCount).toBe(1)
  })

  it('filters transactions by type and category', async () => {
    await prisma.user.createMany({
      data: [
        { id: 'u1', email: 'u1@example.com', name: 'User 1' },
        { id: 'u2', email: 'u2@example.com', name: 'User 2' }
      ]
    })

    await prisma.transaction.createMany({
      data: [
        {
          id: 'f1',
          amount: 5,
          senderId: 'u1',
          receiverId: 'u2',
          type: 'SEND',
          status: 'COMPLETED',
          category: 'FOOD'
        },
        {
          id: 'f2',
          amount: 15,
          senderId: 'u2',
          receiverId: 'u1',
          type: 'SEND',
          status: 'COMPLETED',
          category: 'RENT'
        },
        {
          id: 'f3',
          amount: 25,
          senderId: 'u1',
          receiverId: 'u2',
          type: 'BILL_SPLIT',
          status: 'COMPLETED',
          category: 'ENTERTAINMENT'
        }
      ]
    })

    const res = await request(app)
      .get('/transactions')
      .query({ type: 'bill_split', category: 'entertainment' })
      .set('Authorization', `Bearer ${sign('u1')}`)
      .send()

    expect(res.status).toBe(200)
    expect(res.body.transactions).toHaveLength(1)
    expect(res.body.transactions[0].id).toBe('f3')
    expect(res.body.transactions[0].category).toBe('entertainment')
  })

  it('searches transactions by keyword in description and participant names', async () => {
    await prisma.user.createMany({
      data: [
        { id: 'u1', email: 'u1@example.com', name: 'User One' },
        { id: 'u2', email: 'u2@example.com', name: 'Alice Doe' },
        { id: 'u3', email: 'u3@example.com', name: 'Bob Roe' }
      ]
    })

    await prisma.transaction.createMany({
      data: [
        {
          id: 'k1',
          amount: 12,
          senderId: 'u1',
          receiverId: 'u2',
          type: 'SEND',
          status: 'COMPLETED',
          description: 'Lunch payment'
        },
        {
          id: 'k2',
          amount: 8,
          senderId: 'u3',
          receiverId: 'u1',
          type: 'SEND',
          status: 'COMPLETED'
        }
      ]
    })

    const byDescription = await request(app)
      .get('/transactions')
      .query({ keyword: 'lunch' })
      .set('Authorization', `Bearer ${sign('u1')}`)
      .send()

    expect(byDescription.status).toBe(200)
    expect(byDescription.body.transactions).toHaveLength(1)
    expect(byDescription.body.transactions[0].id).toBe('k1')

    const byName = await request(app)
      .get('/transactions')
      .query({ keyword: 'bob' })
      .set('Authorization', `Bearer ${sign('u1')}`)
      .send()

    expect(byName.status).toBe(200)
    expect(byName.body.transactions).toHaveLength(1)
    expect(byName.body.transactions[0].id).toBe('k2')
  })

  it('supports page-based pagination with hasMore', async () => {
    await prisma.user.createMany({
      data: [
        { id: 'u1', email: 'u1@example.com', name: 'User 1' },
        { id: 'u2', email: 'u2@example.com', name: 'User 2' }
      ]
    })

    const txData = Array.from({ length: 5 }).map((_, i) => ({
      id: `p${i + 1}`,
      amount: i + 1,
      senderId: 'u1',
      receiverId: 'u2',
      type: 'SEND',
      status: 'COMPLETED',
      category: 'OTHER'
    }))
    await prisma.transaction.createMany({ data: txData })

    const page1 = await request(app)
      .get('/transactions')
      .query({ page: 1, size: 2 })
      .set('Authorization', `Bearer ${sign('u1')}`)
      .send()

    expect(page1.status).toBe(200)
    expect(page1.body.transactions).toHaveLength(2)
    expect(page1.body.total).toBe(5)
    expect(page1.body.pageCount).toBe(3)
    expect(page1.body.hasMore).toBe(true)

    const page3 = await request(app)
      .get('/transactions')
      .query({ page: 3, size: 2 })
      .set('Authorization', `Bearer ${sign('u1')}`)
      .send()

    expect(page3.status).toBe(200)
    expect(page3.body.transactions).toHaveLength(1)
    expect(page3.body.hasMore).toBe(false)
  })

  it('returns 404 for missing or unauthorized transaction', async () => {
    await prisma.user.create({ data: { id: 'u1', email: 'u1@example.com', name: 'User 1' } })
    await prisma.user.create({ data: { id: 'u2', email: 'u2@example.com', name: 'User 2' } })
    await prisma.user.create({ data: { id: 'u3', email: 'u3@example.com', name: 'User 3' } })

    const tx = await prisma.transaction.create({
      data: {
        id: 't2',
        amount: 10,
        senderId: 'u1',
        receiverId: 'u2',
        type: 'SEND',
        status: 'COMPLETED'
      }
    })

    const unauthorized = await request(app)
      .get(`/transactions/${tx.id}`)
      .set('Authorization', `Bearer ${sign('u3')}`)
      .send()
    expect(unauthorized.status).toBe(404)

    const missing = await request(app)
      .get('/transactions/nonexistent')
      .set('Authorization', `Bearer ${sign('u1')}`)
      .send()
    expect(missing.status).toBe(404)
  })

  it('returns distinct categories for the user', async () => {
    await prisma.user.create({ data: { id: 'u1', email: 'u1@example.com', name: 'User 1' } })
    await prisma.user.create({ data: { id: 'u2', email: 'u2@example.com', name: 'User 2' } })

    await prisma.transaction.createMany({
      data: [
        {
          id: 'c1',
          amount: 10,
          senderId: 'u1',
          receiverId: 'u2',
          type: 'SEND',
          status: 'COMPLETED',
          category: 'FOOD'
        },
        {
          id: 'c2',
          amount: 15,
          senderId: 'u2',
          receiverId: 'u1',
          type: 'SEND',
          status: 'COMPLETED',
          category: 'RENT'
        },
        {
          id: 'c3',
          amount: 5,
          senderId: 'u1',
          receiverId: 'u2',
          type: 'SEND',
          status: 'COMPLETED',
          category: 'FOOD'
        }
      ]
    })

    const res = await request(app)
      .get('/transactions/categories')
      .set('Authorization', `Bearer ${sign('u1')}`)
      .send()

    expect(res.status).toBe(200)
    expect(res.body.categories).toEqual(expect.arrayContaining(['food', 'rent']))
    expect(res.body.categories).toHaveLength(2)
  })

  it('calculates transaction summary', async () => {
    await prisma.user.create({ data: { id: 'u1', email: 'u1@example.com', name: 'User 1' } })
    await prisma.user.create({ data: { id: 'u2', email: 'u2@example.com', name: 'User 2' } })

    await prisma.transaction.createMany({
      data: [
        {
          id: 's1',
          amount: 20,
          senderId: 'u1',
          receiverId: 'u2',
          type: 'SEND',
          status: 'COMPLETED'
        },
        {
          id: 'r1',
          amount: 50,
          senderId: 'u2',
          receiverId: 'u1',
          type: 'SEND',
          status: 'COMPLETED'
        }
      ]
    })

    const res = await request(app)
      .get('/transactions/summary')
      .set('Authorization', `Bearer ${sign('u1')}`)
      .send()

    expect(res.status).toBe(200)
    expect(res.body.totalSent).toBe(20)
    expect(res.body.totalReceived).toBe(50)
    expect(res.body.netFlow).toBe(30)
  })
})
