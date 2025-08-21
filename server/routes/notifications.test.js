/**
 * @vitest-environment node
 */
import express from 'express'
import request from 'supertest'
import notificationRouter from './notifications.js'
import { PrismaClient } from '@prisma/client'
import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest'
import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'

describe('Notification routes', () => {
  let app
  let prisma
  const dbPath = path.join(__dirname, '..', 'prisma', 'test.db')

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
    await prisma.user.deleteMany()

    app = express()
    app.use(express.json())
    app.use((req, res, next) => {
      req.prisma = prisma
      next()
    })
    app.use(notificationRouter)
  })

  afterAll(async () => {
    await prisma.$disconnect()
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
  })

  it('lists notifications and filters unread', async () => {
    await prisma.user.create({
      data: { id: 'u1', email: 'u1@example.com', name: 'User 1' }
    })
    await prisma.notification.createMany({
      data: [
        {
          recipientId: 'u1',
          type: 'payment',
          title: 'n1',
          message: 'm1',
          createdAt: '2024-01-01T00:00:00.000Z',
          read: false
        },
        {
          recipientId: 'u1',
          type: 'payment',
          title: 'n2',
          message: 'm2',
          createdAt: '2024-01-02T00:00:00.000Z',
          read: true
        }
      ]
    })

    const res = await request(app)
      .get('/notifications')
      .set('x-user-id', 'u1')
    expect(res.status).toBe(200)
    expect(res.body.notifications).toHaveLength(2)

    const unreadRes = await request(app)
      .get('/notifications?filter=unread')
      .set('x-user-id', 'u1')
    expect(unreadRes.status).toBe(200)
    expect(unreadRes.body.notifications).toHaveLength(1)
    expect(unreadRes.body.notifications[0].read).toBe(false)
  })

  it('returns count of unread notifications', async () => {
    await prisma.user.create({
      data: { id: 'u1', email: 'u1@example.com', name: 'User 1' }
    })
    await prisma.notification.createMany({
      data: [
        {
          recipientId: 'u1',
          type: 'payment',
          title: 'n1',
          message: 'm1',
          createdAt: '2024-01-01T00:00:00.000Z',
          read: false
        },
        {
          recipientId: 'u1',
          type: 'payment',
          title: 'n2',
          message: 'm2',
          createdAt: '2024-01-02T00:00:00.000Z',
          read: true
        }
      ]
    })

    const res = await request(app)
      .get('/notifications/unread')
      .set('x-user-id', 'u1')
    expect(res.status).toBe(200)
    expect(res.body.count).toBe(1)
  })

  it('marks notifications as read individually and collectively', async () => {
    await prisma.user.create({
      data: { id: 'u1', email: 'u1@example.com', name: 'User 1' }
    })
    const n1 = await prisma.notification.create({
      data: {
        recipientId: 'u1',
        type: 'payment',
        title: 'n1',
        message: 'm1',
        createdAt: '2024-01-01T00:00:00.000Z'
      }
    })
    const n2 = await prisma.notification.create({
      data: {
        recipientId: 'u1',
        type: 'payment',
        title: 'n2',
        message: 'm2',
        createdAt: '2024-01-02T00:00:00.000Z'
      }
    })

    const markOne = await request(app)
      .patch(`/notifications/${n1.id}/read`)
      .set('x-user-id', 'u1')
      .send()
    expect(markOne.status).toBe(200)
    expect(markOne.body.notification.read).toBe(true)

    const countRes1 = await request(app)
      .get('/notifications/unread')
      .set('x-user-id', 'u1')
    expect(countRes1.body.count).toBe(1)

    const markAll = await request(app)
      .patch('/notifications/mark-all-read')
      .set('x-user-id', 'u1')
      .send()
    expect(markAll.status).toBe(200)
    expect(markAll.body.count).toBe(1)

    const countRes2 = await request(app)
      .get('/notifications/unread')
      .set('x-user-id', 'u1')
    expect(countRes2.body.count).toBe(0)
  })

  it('updates and retrieves notification settings', async () => {
    await prisma.user.create({
      data: { id: 'u1', email: 'u1@example.com', name: 'User 1' }
    })

    const getRes = await request(app)
      .get('/notification-settings')
      .set('x-user-id', 'u1')
    expect(getRes.status).toBe(200)
    expect(getRes.body.settings.push.enabled).toBe(true)

    const newSettings = { push: { enabled: false }, sms: { enabled: true } }
    const updateRes = await request(app)
      .patch('/notification-settings')
      .set('x-user-id', 'u1')
      .send(newSettings)
    expect(updateRes.status).toBe(200)
    expect(updateRes.body.settings.push.enabled).toBe(false)
    expect(updateRes.body.settings.sms.enabled).toBe(true)

    const getRes2 = await request(app)
      .get('/notification-settings')
      .set('x-user-id', 'u1')
    expect(getRes2.body.settings.push.enabled).toBe(false)
    expect(getRes2.body.settings.sms.enabled).toBe(true)
  })
})

