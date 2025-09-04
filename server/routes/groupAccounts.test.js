/**
 * @vitest-environment node
 */
import express from 'express'
import request from 'supertest'
import groupAccountRouter from './groupAccounts.js'
import { PrismaClient } from '@prisma/client'
import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest'
import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'

describe('Group account routes', () => {
  let app
  let prisma
  const dbPath = path.join(__dirname, '..', 'prisma', 'group-accounts-test.db')

  beforeAll(() => {
    process.env.DATABASE_URL = `file:${dbPath}`
    process.env.ALLOW_HEADER_AUTH = 'true'
    execSync('npx prisma migrate deploy', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    })
    prisma = new PrismaClient()
  })

  beforeEach(async () => {
    await prisma.groupAccount.deleteMany()
    await prisma.groupMember.deleteMany()
    await prisma.group.deleteMany()
    await prisma.user.deleteMany()

    await prisma.user.create({
      data: { id: 'u1', email: 'u1@example.com', name: 'User 1', region: 'NG' }
    })
    await prisma.group.create({ data: { id: 'g1', name: 'Group 1' } })
    await prisma.groupMember.create({
      data: { groupId: 'g1', userId: 'u1', role: 'ADMIN' }
    })

    app = express()
    app.use(express.json())
    app.use((req, res, next) => {
      req.prisma = prisma
      next()
    })
    app.use('/groups/:groupId/accounts', groupAccountRouter)
  })

  afterAll(async () => {
    await prisma.$disconnect()
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
  })

  it('creates and updates accountType', async () => {
    const createRes = await request(app)
      .post('/groups/g1/accounts')
      .set('x-user-id', 'u1')
      .send({
        type: 'bank',
        bank: 'Access Bank',
        accountNumber: '1234567890',
        accountName: 'Test Account',
        accountType: 'savings'
      })
    expect(createRes.status).toBe(201)
    expect(createRes.body.account).toMatchObject({ accountType: 'savings' })
    const accountId = createRes.body.account.id

    const updateRes = await request(app)
      .put(`/groups/g1/accounts/${accountId}`)
      .set('x-user-id', 'u1')
      .send({ accountType: 'checking' })
    expect(updateRes.status).toBe(200)
    expect(updateRes.body.account).toMatchObject({ accountType: 'checking' })
  })

  it('rejects invalid account number for region', async () => {
    const res = await request(app)
      .post('/groups/g1/accounts')
      .set('x-user-id', 'u1')
      .send({
        type: 'bank',
        bank: 'Access Bank',
        accountNumber: '123',
        accountName: 'Test Account',
        accountType: 'savings'
      })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/account number/i)
  })

  it('rejects phone numbers without correct prefix', async () => {
    const res = await request(app)
      .post('/groups/g1/accounts')
      .set('x-user-id', 'u1')
      .send({
        type: 'mobile_money',
        provider: 'Opay',
        phoneNumber: '+1234567890'
      })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/phone number/i)
  })
})
