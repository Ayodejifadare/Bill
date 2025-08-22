/**
 * @vitest-environment node
 */
import express from 'express'
import request from 'supertest'
import friendsRouter from './friends.js'
import { PrismaClient } from '@prisma/client'
import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest'
import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import jwt from 'jsonwebtoken'

const sign = userId => jwt.sign({ userId, tokenVersion: 0 }, 'your-secret-key')

describe('Friend routes', () => {
  let app
  let prisma
  const dbPath = path.join(__dirname, '..', 'prisma', 'friends-test.db')

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
    app.use('/friends', friendsRouter)
  })

  afterAll(async () => {
    await prisma.$disconnect()
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
  })

  it('lists friends including pending requests', async () => {
    await prisma.user.create({ data: { id: 'u1', email: 'u1@example.com', name: 'User 1' } })
    await prisma.user.create({ data: { id: 'u2', email: 'u2@example.com', name: 'User 2' } })
    await prisma.user.create({ data: { id: 'u3', email: 'u3@example.com', name: 'User 3' } })
    await prisma.friendship.create({ data: { user1Id: 'u1', user2Id: 'u2' } })
    const fr = await prisma.friendRequest.create({ data: { senderId: 'u3', receiverId: 'u1' } })

    const res = await request(app)
      .get('/friends')
      .set('Authorization', `Bearer ${sign('u1')}`)

    expect(res.status).toBe(200)
    expect(res.body.friends).toHaveLength(2)
    const active = res.body.friends.find(f => f.id === 'u2')
    const pending = res.body.friends.find(f => f.id === 'u3')
    expect(active.status).toBe('active')
    expect(pending.status).toBe('pending')
    expect(pending.requestId).toBe(fr.id)
  })

  it('returns summary of amounts owed with friends', async () => {
    await prisma.user.create({ data: { id: 'u1', email: 'u1@example.com', name: 'User 1' } })
    await prisma.user.create({ data: { id: 'u2', email: 'u2@example.com', name: 'User 2' } })
    await prisma.user.create({ data: { id: 'u3', email: 'u3@example.com', name: 'User 3' } })
    await prisma.user.create({ data: { id: 'u4', email: 'u4@example.com', name: 'User 4' } })

    await prisma.friendship.create({ data: { user1Id: 'u1', user2Id: 'u2' } })
    await prisma.friendship.create({ data: { user1Id: 'u1', user2Id: 'u3' } })

    await prisma.transaction.create({
      data: {
        amount: 30,
        senderId: 'u2',
        receiverId: 'u1',
        type: 'SEND',
        status: 'PENDING'
      }
    })
    await prisma.transaction.create({
      data: {
        amount: 10,
        senderId: 'u1',
        receiverId: 'u3',
        type: 'SEND',
        status: 'PENDING'
      }
    })
    await prisma.transaction.create({
      data: {
        amount: 40,
        senderId: 'u4',
        receiverId: 'u1',
        type: 'SEND',
        status: 'PENDING'
      }
    })
    await prisma.transaction.create({
      data: {
        amount: 5,
        senderId: 'u2',
        receiverId: 'u1',
        type: 'SEND',
        status: 'COMPLETED'
      }
    })

    const res = await request(app)
      .get('/friends/summary')
      .set('Authorization', `Bearer ${sign('u1')}`)
      .send()

    expect(res.status).toBe(200)
    expect(res.body.owedToUser).toBe(30)
    expect(res.body.userOwes).toBe(10)
  })

  it('sends and accepts friend requests', async () => {
    await prisma.user.create({ data: { id: 'u1', email: 'u1@example.com', name: 'User 1' } })
    await prisma.user.create({ data: { id: 'u2', email: 'u2@example.com', name: 'User 2' } })

    const sendRes = await request(app)
      .post('/friends/request')
      .set('Authorization', `Bearer ${sign('u1')}`)
      .send({ receiverId: 'u2' })
    expect(sendRes.status).toBe(201)
    const requestId = sendRes.body.friendRequest.id

    const acceptRes = await request(app)
      .post(`/friends/requests/${requestId}/accept`)
      .set('Authorization', `Bearer ${sign('u2')}`)
      .send()
    expect(acceptRes.status).toBe(200)
    expect(acceptRes.body.friendRequest.status).toBe('ACCEPTED')
    const friendship = await prisma.friendship.findFirst()
    expect(friendship).toBeTruthy()
  })

  it('declines friend requests', async () => {
    await prisma.user.create({ data: { id: 'u1', email: 'u1@example.com', name: 'User 1' } })
    await prisma.user.create({ data: { id: 'u2', email: 'u2@example.com', name: 'User 2' } })
    const fr = await prisma.friendRequest.create({ data: { senderId: 'u1', receiverId: 'u2' } })

    const declineRes = await request(app)
      .post(`/friends/requests/${fr.id}/decline`)
      .set('Authorization', `Bearer ${sign('u2')}`)
      .send()
    expect(declineRes.status).toBe(200)
    expect(declineRes.body.friendRequest.status).toBe('DECLINED')
  })

  it('cancels friend requests', async () => {
    await prisma.user.create({ data: { id: 'u4', email: 'u4@example.com', name: 'User 4' } })
    await prisma.user.create({ data: { id: 'u5', email: 'u5@example.com', name: 'User 5' } })
    const fr = await prisma.friendRequest.create({ data: { senderId: 'u4', receiverId: 'u5' } })

    const cancelRes = await request(app)
      .delete(`/friends/requests/${fr.id}`)
      .set('Authorization', `Bearer ${sign('u4')}`)
      .send()
    expect(cancelRes.status).toBe(200)
    expect(cancelRes.body.friendRequest.status).toBe('CANCELLED')
  })

  it('fetches friend profile with transactions and shared groups', async () => {
    await prisma.user.create({ data: { id: 'u1', email: 'u1@example.com', name: 'User 1' } })
    await prisma.user.create({ data: { id: 'u2', email: 'u2@example.com', name: 'User 2' } })
    await prisma.friendship.create({ data: { user1Id: 'u1', user2Id: 'u2' } })
    const g1 = await prisma.group.create({ data: { id: 'g1', name: 'Group 1' } })
    await prisma.groupMember.create({ data: { groupId: g1.id, userId: 'u1' } })
    await prisma.groupMember.create({ data: { groupId: g1.id, userId: 'u2' } })
    await prisma.transaction.create({
      data: {
        amount: 25,
        senderId: 'u1',
        receiverId: 'u2',
        type: 'SEND',
        status: 'COMPLETED'
      }
    })
    await prisma.billSplit.create({
      data: {
        title: 'Dinner',
        totalAmount: 40,
        createdBy: 'u1',
        participants: {
          create: [
            { userId: 'u1', amount: 20 },
            { userId: 'u2', amount: 20 }
          ]
        }
      }
    })

    const res = await request(app)
      .get('/friends/u2')
      .set('Authorization', `Bearer ${sign('u1')}`)
      .send()

    expect(res.status).toBe(200)
    expect(res.body.friend.id).toBe('u2')
    expect(res.body.transactions).toHaveLength(1)
    expect(res.body.sharedGroups).toHaveLength(1)
    expect(res.body.sharedGroups[0].totalSpent).toBe(65)
  })

  it('removes a friend', async () => {
    await prisma.user.create({ data: { id: 'u1', email: 'u1@example.com', name: 'User 1' } })
    await prisma.user.create({ data: { id: 'u2', email: 'u2@example.com', name: 'User 2' } })
    await prisma.friendship.create({ data: { user1Id: 'u1', user2Id: 'u2' } })

    const res = await request(app)
      .delete('/friends/u2')
      .set('Authorization', `Bearer ${sign('u1')}`)
      .send()
    expect(res.status).toBe(200)
    const count = await prisma.friendship.count()
    expect(count).toBe(0)
  })
})
