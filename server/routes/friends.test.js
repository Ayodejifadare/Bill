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

describe('Friends shared groups', () => {
  let app
  let prisma
  const dbPath = path.join(__dirname, '..', 'prisma', 'friends-test.db')

  beforeAll(() => {
    process.env.DATABASE_URL = `file:${dbPath}`
    execSync('npx prisma migrate deploy', { cwd: path.join(__dirname, '..'), stdio: 'inherit' })
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

  it('calculates shared group totals based on spending', async () => {
    await prisma.user.createMany({
      data: [
        { id: 'u1', email: 'u1@example.com', name: 'User 1' },
        { id: 'u2', email: 'u2@example.com', name: 'User 2' },
        { id: 'u3', email: 'u3@example.com', name: 'User 3' }
      ]
    })

    await prisma.friendship.create({ data: { user1Id: 'u1', user2Id: 'u2' } })

    const g1 = await prisma.group.create({ data: { id: 'g1', name: 'Group 1' } })
    const g2 = await prisma.group.create({ data: { id: 'g2', name: 'Group 2' } })
    await prisma.groupMember.createMany({
      data: [
        { groupId: g1.id, userId: 'u1' },
        { groupId: g1.id, userId: 'u2' },
        { groupId: g2.id, userId: 'u1' },
        { groupId: g2.id, userId: 'u2' },
        { groupId: g2.id, userId: 'u3' }
      ]
    })

    await prisma.transaction.create({
      data: {
        amount: 10,
        senderId: 'u1',
        receiverId: 'u2',
        type: 'SEND',
        status: 'COMPLETED'
      }
    })

    await prisma.billSplit.create({
      data: {
        title: 'Dinner',
        totalAmount: 30,
        createdBy: 'u1',
        participants: {
          create: [
            { userId: 'u1', amount: 15 },
            { userId: 'u2', amount: 15 }
          ]
        }
      }
    })

    await prisma.billSplit.create({
      data: {
        title: 'Trip',
        totalAmount: 60,
        createdBy: 'u1',
        participants: {
          create: [
            { userId: 'u1', amount: 20 },
            { userId: 'u2', amount: 20 },
            { userId: 'u3', amount: 20 }
          ]
        }
      }
    })

    const token = jwt.sign({ userId: 'u1', tokenVersion: 0 }, 'your-secret-key')

    const res = await request(app)
      .get(`/friends/u2`)
      .set('Authorization', `Bearer ${token}`)
      .send()

    expect(res.status).toBe(200)
    const groups = res.body.sharedGroups
    const sg1 = groups.find(g => g.id === g1.id)
    const sg2 = groups.find(g => g.id === g2.id)
    expect(sg1.totalSpent).toBe(40)
    expect(sg2.totalSpent).toBe(80)
  })
})
