/**
 * @vitest-environment node
 */
import express from 'express'
import request from 'supertest'
import billSplitsRouter from './billSplits.js'
import { PrismaClient } from '@prisma/client'
import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest'
import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import jwt from 'jsonwebtoken'

const sign = userId => jwt.sign({ userId, tokenVersion: 0 }, 'your-secret-key')

describe('Bill split routes', () => {
  let app
  let prisma
  const dbPath = path.join(__dirname, '..', 'prisma', 'bill-splits-test.db')

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
    await prisma.billItem.deleteMany()
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
    app.use('/bill-splits', billSplitsRouter)
  })

  afterAll(async () => {
    await prisma.$disconnect()
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
  })

  it('retrieves a bill split by id with details', async () => {
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
        splitMethod: 'equal',
        paymentMethodId: pm.id,
        participants: {
          create: [
            { userId: 'u1', amount: 50, isPaid: true },
            { userId: 'u2', amount: 50, isPaid: false }
          ]
        },
        items: {
          create: [
            { name: 'Pizza', price: 60, quantity: 1 },
            { name: 'Drinks', price: 40, quantity: 1 }
          ]
        }
      }
    })

    const res = await request(app)
      .get(`/bill-splits/${bs.id}`)
      .set('Authorization', `Bearer ${sign('u1')}`)
      .send()

    expect(res.status).toBe(200)
    expect(res.body.billSplit.id).toBe(bs.id)
    expect(res.body.billSplit.participants).toHaveLength(2)
    expect(res.body.billSplit.items).toHaveLength(2)
    expect(res.body.billSplit.paymentMethod).toMatchObject({ id: pm.id, type: 'bank' })
    expect(res.body.billSplit.organizer.name).toBe('You')
    expect(res.body.billSplit.creatorId).toBe('u1')
  })

  it('returns 404 for missing or unauthorized bill split', async () => {
    await prisma.user.create({ data: { id: 'u1', email: 'u1@example.com', name: 'User 1' } })
    await prisma.user.create({ data: { id: 'u2', email: 'u2@example.com', name: 'User 2' } })
    await prisma.user.create({ data: { id: 'u3', email: 'u3@example.com', name: 'User 3' } })

    const bs = await prisma.billSplit.create({
      data: {
        id: 'bs2',
        title: 'Lunch',
        totalAmount: 50,
        createdBy: 'u1',
        participants: {
          create: [
            { userId: 'u1', amount: 25, isPaid: true },
            { userId: 'u2', amount: 25, isPaid: false }
          ]
        }
      }
    })

    const unauthorized = await request(app)
      .get(`/bill-splits/${bs.id}`)
      .set('Authorization', `Bearer ${sign('u3')}`)
      .send()
    expect(unauthorized.status).toBe(404)

    const missing = await request(app)
      .get('/bill-splits/nonexistent')
      .set('Authorization', `Bearer ${sign('u1')}`)
      .send()
    expect(missing.status).toBe(404)
  })
})

