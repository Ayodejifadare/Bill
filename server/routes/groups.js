import express from 'express'
import groupAccountRouter from './groupAccounts.js'

const router = express.Router()

// In-memory groups store
const groups = []

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
  }
  groups.push(newGroup)
  res.status(201).json({ group: newGroup })
})

// Mount account routes for a given group
router.use('/:groupId/accounts', groupAccountRouter)

export default router
