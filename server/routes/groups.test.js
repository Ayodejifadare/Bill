/**
 * @vitest-environment node
 */
import express from 'express'
import request from 'supertest'
import groupRouter, { groups } from './groups.js'
import { describe, it, expect, beforeEach } from 'vitest'

describe('Group join/leave routes', () => {
  let app
  beforeEach(() => {
    groups.length = 0
    app = express()
    app.use(express.json())
    app.use('/groups', groupRouter)
  })

  it('joins and leaves a group', async () => {
    const createRes = await request(app).post('/groups').send({ name: 'Test' })
    const groupId = createRes.body.group.id

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
