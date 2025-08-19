import express from 'express'
import groupAccountRouter from './groupAccounts.js'

const router = express.Router()

// GET / - list all groups
router.get('/', async (req, res) => {
  try {
    const groups = await req.prisma.group.findMany({
      include: { members: true }
    })
    const formatted = groups.map((g) => ({
      id: g.id,
      name: g.name,
      members: g.members.map((m) => m.userId)
    }))
    res.json({ groups: formatted })
  } catch (error) {
    console.error('List groups error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST / - create a new group
router.post('/', async (req, res) => {
  try {
    const { name } = req.body
    if (!name) {
      return res.status(400).json({ error: 'Group name is required' })
    }

    const group = await req.prisma.group.create({
      data: { name }
    })

    res.status(201).json({ group: { ...group, members: [] } })
  } catch (error) {
    console.error('Create group error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /:groupId/join - add current user to group
router.post('/:groupId/join', async (req, res) => {
  try {
    const group = await req.prisma.group.findUnique({
      where: { id: req.params.groupId },
      include: { members: true }
    })
    if (!group) {
      return res.status(404).json({ error: 'Group not found' })
    }

    const userId = req.headers['x-user-id'] || 'current-user'

    await req.prisma.groupMember.upsert({
      where: {
        groupId_userId: { groupId: group.id, userId }
      },
      update: {},
      create: { groupId: group.id, userId }
    })

    const updated = await req.prisma.group.findUnique({
      where: { id: group.id },
      include: { members: true }
    })

    res.json({
      group: {
        id: updated.id,
        name: updated.name,
        members: updated.members.map((m) => m.userId)
      }
    })
  } catch (error) {
    console.error('Join group error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /:groupId/leave - remove current user from group
router.post('/:groupId/leave', async (req, res) => {
  try {
    const group = await req.prisma.group.findUnique({
      where: { id: req.params.groupId },
      include: { members: true }
    })
    if (!group) {
      return res.status(404).json({ error: 'Group not found' })
    }
    const userId = req.headers['x-user-id'] || 'current-user'

    await req.prisma.groupMember.deleteMany({
      where: { groupId: group.id, userId }
    })

    const updated = await req.prisma.group.findUnique({
      where: { id: group.id },
      include: { members: true }
    })

    res.json({
      group: {
        id: updated.id,
        name: updated.name,
        members: updated.members.map((m) => m.userId)
      }
    })
  } catch (error) {
    console.error('Leave group error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Mount account routes for a given group
router.use('/:groupId/accounts', groupAccountRouter)

export default router

