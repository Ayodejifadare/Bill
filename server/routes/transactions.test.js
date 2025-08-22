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

const sign = userId => jwt.sign({ userId, tokenVersion: 0 }, 'your-secret-key')

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
