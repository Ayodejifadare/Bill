import express from 'express'
import groupAccountRouter from './groupAccounts.js'

const router = express.Router()

// In-memory groups store
export const groups = []

// GET / - list all groups
router.get('/', (req, res) => {
  res.json({ groups })
})

// POST / - create a new group
router.post('/', (req, res) => {
  const { name } = req.body
  if (!name) {
    return res.status(400).json({ error: 'Group name is required' })
  }
  const newGroup = {
    id: Date.now().toString(),
    name,
    members: [],
  }
  groups.push(newGroup)
  res.status(201).json({ group: newGroup })
})

// POST /:groupId/join - add current user to group
router.post('/:groupId/join', (req, res) => {
  const group = groups.find((g) => g.id === req.params.groupId)
  if (!group) {
    return res.status(404).json({ error: 'Group not found' })
  }
  const userId = req.headers['x-user-id'] || 'current-user'
  if (!group.members.includes(userId)) {
    group.members.push(userId)
  }
  res.json({ group })
})

// POST /:groupId/leave - remove current user from group
router.post('/:groupId/leave', (req, res) => {
  const group = groups.find((g) => g.id === req.params.groupId)
  if (!group) {
    return res.status(404).json({ error: 'Group not found' })
  }
  const userId = req.headers['x-user-id'] || 'current-user'
  group.members = group.members.filter((m) => m !== userId)
  res.json({ group })
})

// Mount account routes for a given group
router.use('/:groupId/accounts', groupAccountRouter)

export default router
