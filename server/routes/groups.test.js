/**
 * @vitest-environment node
 */
import express from 'express'
import request from 'supertest'
import groupRouter from './groups.js'
import { PrismaClient } from '@prisma/client'
import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest'
import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'

describe('Group join/leave routes', () => {
  let app
  let prisma
  const dbPath = path.join(__dirname, '..', 'prisma', 'test.db')

  beforeAll(() => {
    process.env.DATABASE_URL = `file:${dbPath}`
    execSync('npx prisma migrate deploy', { cwd: path.join(__dirname, '..'), stdio: 'inherit' })
    prisma = new PrismaClient()
  })

  beforeEach(async () => {
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
    app.use('/groups', groupRouter)
  })

  afterAll(async () => {
    await prisma.$disconnect()
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
  })

  it('joins and leaves a group', async () => {
    const createRes = await request(app).post('/groups').send({ name: 'Test' })
    const groupId = createRes.body.group.id

      await prisma.user.create({ data: { id: 'user1', email: 'user1@example.com', name: 'User 1' } })

      const joinRes = await request(app)
        .post(`/groups/${groupId}/join`)
        .set('x-user-id', 'user1')
        .send()
    expect(joinRes.status).toBe(200)
    expect(joinRes.body.group.members).toContain('user1')

    const leaveRes = await request(app)
      .post(`/groups/${groupId}/leave`)
      .set('x-user-id', 'user1')
      .send()
    expect(leaveRes.status).toBe(200)
    expect(leaveRes.body.group.members).not.toContain('user1')
  })
})
