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

  it('requires a valid JWT token', async () => {
    const res = await request(app).get('/bill-splits').send()
    expect(res.status).toBe(401)

    const invalid = await request(app)
      .get('/bill-splits')
      .set('Authorization', 'Bearer invalidtoken')
      .send()
    expect(invalid.status).toBe(401)
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
    expect(res.body.billSplit.createdBy).toBe('You')
    expect(res.body.billSplit.participants).toContainEqual({
      name: 'You',
      amount: 50,
      paid: true
    })
    expect(res.body.billSplit.participants).toContainEqual({
      name: 'User 2',
      amount: 50,
      paid: false
    })
    expect(res.body.billSplit.creatorId).toBe('u1')
  })

  it('lists bill splits with group info', async () => {
    await prisma.user.create({ data: { id: 'u1', email: 'u1@example.com', name: 'User 1' } })
    await prisma.user.create({ data: { id: 'u2', email: 'u2@example.com', name: 'User 2' } })

    const group = await prisma.group.create({ data: { id: 'g1', name: 'Test Group' } })

    await prisma.billSplit.create({
      data: {
        id: 'bs-list',
        title: 'Lunch',
        totalAmount: 40,
        createdBy: 'u1',
        groupId: group.id,
        participants: {
          create: [
            { userId: 'u1', amount: 20, isPaid: true },
            { userId: 'u2', amount: 20, isPaid: false }
          ]
        }
      }
    })

    const res = await request(app)
      .get('/bill-splits')
      .set('Authorization', `Bearer ${sign('u1')}`)
      .send()

    expect(res.status).toBe(200)
    expect(res.body.billSplits).toHaveLength(1)
    expect(res.body.billSplits[0].groupId).toBe(group.id)
    expect(res.body.billSplits[0].groupName).toBe(group.name)
  })

  it('includes schedule metadata for recurring bill splits', async () => {
    await prisma.user.create({ data: { id: 'u1', email: 'u1@example.com', name: 'User 1' } })
    await prisma.user.create({ data: { id: 'u2', email: 'u2@example.com', name: 'User 2' } })

    const bs = await prisma.billSplit.create({
      data: {
        id: 'bs-rec',
        title: 'Sub',
        totalAmount: 20,
        createdBy: 'u1',
        isRecurring: true,
        participants: {
          create: [
            { userId: 'u1', amount: 10, isPaid: true },
            { userId: 'u2', amount: 10, isPaid: false }
          ]
        }
      }
    })

    const nextRun = new Date('2025-01-01T00:00:00Z')
    await prisma.recurringBillSplit.create({
      data: { billSplitId: bs.id, frequency: 'weekly', day: 1, nextRun }
    })

    const byId = await request(app)
      .get(`/bill-splits/${bs.id}`)
      .set('Authorization', `Bearer ${sign('u1')}`)
      .send()
    expect(byId.status).toBe(200)
    expect(byId.body.billSplit.schedule.frequency).toBe('weekly')
    expect(byId.body.billSplit.schedule.nextRun).toBe(nextRun.toISOString())

    const list = await request(app)
      .get('/bill-splits')
      .set('Authorization', `Bearer ${sign('u1')}`)
      .send()
    expect(list.status).toBe(200)
    expect(list.body.billSplits[0].schedule.frequency).toBe('weekly')
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

  it('updates payment status for participant', async () => {
    await prisma.user.create({ data: { id: 'u1', email: 'u1@example.com', name: 'User 1' } })
    await prisma.user.create({ data: { id: 'u2', email: 'u2@example.com', name: 'User 2' } })

    const bs = await prisma.billSplit.create({
      data: {
        id: 'bs-pay',
        title: 'Brunch',
        totalAmount: 40,
        createdBy: 'u1',
        participants: {
          create: [
            { userId: 'u1', amount: 20, isPaid: false },
            { userId: 'u2', amount: 20, isPaid: false }
          ]
        }
      }
    })

    const sentRes = await request(app)
      .post(`/bill-splits/${bs.id}/payments`)
      .set('Authorization', `Bearer ${sign('u2')}`)
      .send({})
    expect(sentRes.status).toBe(200)
    let participant = await prisma.billSplitParticipant.findUnique({
      where: { billSplitId_userId: { billSplitId: bs.id, userId: 'u2' } }
    })
    expect(participant.status).toBe('SENT')
    expect(participant.isPaid).toBe(false)

    const confirmRes = await request(app)
      .post(`/bill-splits/${bs.id}/payments`)
      .set('Authorization', `Bearer ${sign('u2')}`)
      .send({ status: 'CONFIRMED' })
    expect(confirmRes.status).toBe(200)
    participant = await prisma.billSplitParticipant.findUnique({
      where: { billSplitId_userId: { billSplitId: bs.id, userId: 'u2' } }
    })
    expect(participant.status).toBe('CONFIRMED')
    expect(participant.isPaid).toBe(true)
  })

  it('sends reminders to participants and logs them', async () => {
    await prisma.user.create({ data: { id: 'u1', email: 'u1@example.com', name: 'User 1' } })
    await prisma.user.create({ data: { id: 'u2', email: 'u2@example.com', name: 'User 2' } })

    const bs = await prisma.billSplit.create({
      data: {
        id: 'bs-rem',
        title: 'Trip',
        totalAmount: 100,
        createdBy: 'u1',
        participants: {
          create: [
            { userId: 'u1', amount: 50, isPaid: true },
            { userId: 'u2', amount: 50, isPaid: false }
          ]
        }
      }
    })

    const res = await request(app)
      .post(`/bill-splits/${bs.id}/reminders`)
      .set('Authorization', `Bearer ${sign('u1')}`)
      .send({ participantIds: ['u2'], type: 'friendly', template: 'Please pay' })

    expect(res.status).toBe(201)
    expect(res.body.reminders).toHaveLength(1)

    const reminder = await prisma.billSplitReminder.findFirst({
      where: { billSplitId: bs.id, recipientId: 'u2' }
    })
    expect(reminder).not.toBeNull()

    const notification = await prisma.notification.findFirst({
      where: { recipientId: 'u2', type: 'bill_split_reminder' }
    })
    expect(notification).not.toBeNull()
  })
})

