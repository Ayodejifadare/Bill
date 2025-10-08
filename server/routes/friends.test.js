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

const sign = userId => jwt.sign({ userId, tokenVersion: 0 }, process.env.JWT_SECRET)

describe('Friend routes', () => {
  let app
  let prisma
  const dbPath = path.join(__dirname, '..', 'prisma', 'friends-test.db')

  beforeAll(() => {
    process.env.DATABASE_URL = `file:${dbPath}`
    process.env.DIRECT_URL = process.env.DATABASE_URL
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

  it('lists active friends along with incoming and outgoing pending requests', async () => {
    await prisma.user.create({ data: { id: 'u1', email: 'u1@example.com', name: 'User 1', phone: '+10000000001' } })
    await prisma.user.create({ data: { id: 'u2', email: 'u2@example.com', name: 'User 2', phone: '+10000000002' } })
    await prisma.user.create({ data: { id: 'u3', email: 'u3@example.com', name: 'User 3', phone: '+10000000003' } })
    await prisma.user.create({ data: { id: 'u4', email: 'u4@example.com', name: 'User 4', phone: '+10000000004' } })
    await prisma.friendship.create({ data: { user1Id: 'u1', user2Id: 'u2' } })
    const incoming = await prisma.friendRequest.create({ data: { senderId: 'u3', receiverId: 'u1' } })
    const outgoing = await prisma.friendRequest.create({ data: { senderId: 'u1', receiverId: 'u4' } })

    const res = await request(app)
      .get('/friends')
      .set('Authorization', `Bearer ${sign('u1')}`)

    expect(res.status).toBe(200)
    expect(res.body.friends).toHaveLength(3)
    const active = res.body.friends.find(f => f.id === 'u2')
    const pendingIncoming = res.body.friends.find(f => f.id === 'u3')
    const pendingOutgoing = res.body.friends.find(f => f.id === 'u4')
    expect(active.status).toBe('active')
    expect(active.phoneNumber).toBe('+10000000002')
    expect(active.requestId).toBeUndefined()
    expect(pendingIncoming.status).toBe('pending')
    expect(pendingIncoming.requestId).toBe(incoming.id)
    expect(pendingIncoming.direction).toBe('incoming')
    expect(pendingIncoming.phoneNumber).toBe('+10000000003')
    expect(pendingOutgoing.status).toBe('pending')
    expect(pendingOutgoing.requestId).toBe(outgoing.id)
    expect(pendingOutgoing.direction).toBe('outgoing')
    expect(pendingOutgoing.phoneNumber).toBe('+10000000004')
  })

  it('searches friends by query', async () => {
    await prisma.user.create({ data: { id: 's1', email: 's1@example.com', name: 'Alice', phone: '+20000000001' } })
    await prisma.user.create({ data: { id: 's2', email: 's2@example.com', name: 'Bob', phone: '+20000000002' } })
    await prisma.user.create({ data: { id: 's3', email: 's3@example.com', name: 'Charlie', phone: '+20000000003' } })
    await prisma.friendship.create({ data: { user1Id: 's1', user2Id: 's2' } })
    await prisma.friendship.create({ data: { user1Id: 's1', user2Id: 's3' } })

    const res = await request(app)
      .get('/friends/search?q=Bob')
      .set('Authorization', `Bearer ${sign('s1')}`)

    expect(res.status).toBe(200)
    expect(res.body.friends).toHaveLength(1)
    expect(res.body.friends[0].id).toBe('s2')
    expect(res.body.friends[0].phoneNumber).toBe('+20000000002')
  })

  it('returns 400 for empty search query', async () => {
    await prisma.user.create({ data: { id: 'e1', email: 'e1@example.com', name: 'User 1' } })

    const res = await request(app)
      .get('/friends/search')
      .set('Authorization', `Bearer ${sign('e1')}`)

    expect(res.status).toBe(400)
  })

  it('includes last transaction information for active friends', async () => {
    await prisma.user.create({ data: { id: 'a1', email: 'a1@example.com', name: 'A1' } })
    await prisma.user.create({ data: { id: 'a2', email: 'a2@example.com', name: 'A2' } })
    await prisma.user.create({ data: { id: 'a3', email: 'a3@example.com', name: 'A3' } })
    await prisma.user.create({ data: { id: 'a4', email: 'a4@example.com', name: 'A4' } })

    await prisma.friendship.create({ data: { user1Id: 'a1', user2Id: 'a2' } })
    await prisma.friendship.create({ data: { user1Id: 'a1', user2Id: 'a3' } })
    await prisma.friendship.create({ data: { user1Id: 'a1', user2Id: 'a4' } })

    await prisma.transaction.create({
      data: {
        amount: 10,
        senderId: 'a1',
        receiverId: 'a2',
        type: 'SEND',
        status: 'PENDING'
      }
    })
    await prisma.transaction.create({
      data: {
        amount: 20,
        senderId: 'a2',
        receiverId: 'a1',
        type: 'SEND',
        status: 'PENDING'
      }
    })

    await prisma.transaction.create({
      data: {
        amount: 5,
        senderId: 'a1',
        receiverId: 'a4',
        type: 'SEND',
        status: 'PENDING'
      }
    })

    const res = await request(app)
      .get('/friends')
      .set('Authorization', `Bearer ${sign('a1')}`)

    expect(res.status).toBe(200)
    const withTx = res.body.friends.find(f => f.id === 'a2')
    const withoutTx = res.body.friends.find(f => f.id === 'a3')
    const userOwes = res.body.friends.find(f => f.id === 'a4')
    expect(withTx.lastTransaction).toEqual({ amount: 20, type: 'owed' })
    expect(userOwes.lastTransaction).toEqual({ amount: 5, type: 'owes' })
    expect(withoutTx.lastTransaction).toBeUndefined()
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

  it('returns incoming and outgoing friend requests with metadata', async () => {
    await prisma.user.create({ data: { id: 'a1', email: 'a1@example.com', name: 'A1' } })
    await prisma.user.create({ data: { id: 'a2', email: 'a2@example.com', name: 'A2' } })
    await prisma.user.create({ data: { id: 'a3', email: 'a3@example.com', name: 'A3' } })

    const incoming = await prisma.friendRequest.create({ data: { senderId: 'a2', receiverId: 'a1' } })
    const outgoing = await prisma.friendRequest.create({ data: { senderId: 'a1', receiverId: 'a3' } })

    const res = await request(app)
      .get('/friends/requests')
      .set('Authorization', `Bearer ${sign('a1')}`)

    expect(res.status).toBe(200)
    expect(res.body.incoming).toHaveLength(1)
    expect(res.body.outgoing).toHaveLength(1)
    const inc = res.body.incoming[0]
    const out = res.body.outgoing[0]
    expect(inc.requestId).toBe(incoming.id)
    expect(out.requestId).toBe(outgoing.id)
    expect(inc.sender.id).toBe('a2')
    expect(out.receiver.id).toBe('a3')
    expect(inc.status).toBe('pending')
    expect(out.status).toBe('pending')
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
