import express from 'express'
import authenticate from '../middleware/auth.js'

const router = express.Router({ mergeParams: true })

const requireGroupAdmin = async (req, res, next) => {
  try {
    const membership = await req.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: req.params.groupId,
          userId: req.user.id
        }
      }
    })
    if (!membership || membership.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' })
    }
    next()
  } catch (err) {
    console.error('Group admin check error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}

router.use(authenticate)
router.use(requireGroupAdmin)

// GET / - list invite links
router.get('/', async (req, res) => {
  try {
    const links = await req.prisma.groupInviteLink.findMany({
      where: { groupId: req.params.groupId }
    })

    const formatted = links.map((l) => ({
      id: l.id,
      link: l.link,
      createdAt: l.createdAt.toISOString(),
      expiresAt: l.expiresAt.toISOString(),
      maxUses: l.maxUses,
      currentUses: l.currentUses,
      createdBy: l.createdBy,
      isActive: l.isActive
    }))

    res.json({ links: formatted })
  } catch (error) {
    console.error('List invite links error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST / - create new invite link
router.post('/', async (req, res) => {
  try {
    const { maxUses = 10, expireDays = 7 } = req.body || {}
    const id = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)
    const link = `https://example.com/invite/${id}`
    const expiresAt = new Date(Date.now() + expireDays * 24 * 60 * 60 * 1000)
    const created = await req.prisma.groupInviteLink.create({
      data: {
        groupId: req.params.groupId,
        link,
        maxUses,
        expiresAt,
        createdBy: req.user.id
      }
    })

    const formatted = {
      id: created.id,
      link: created.link,
      createdAt: created.createdAt.toISOString(),
      expiresAt: created.expiresAt.toISOString(),
      maxUses: created.maxUses,
      currentUses: created.currentUses,
      createdBy: created.createdBy,
      isActive: created.isActive
    }

    res.status(201).json({ link: formatted })
  } catch (error) {
    console.error('Create invite link error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /:linkId/deactivate - disable an invite link
router.post('/:linkId/deactivate', async (req, res) => {
  try {
    const existing = await req.prisma.groupInviteLink.findUnique({
      where: { id: req.params.linkId }
    })
    if (!existing || existing.groupId !== req.params.groupId) {
      return res.status(404).json({ error: 'Link not found' })
    }
    const updated = await req.prisma.groupInviteLink.update({
      where: { id: existing.id },
      data: { isActive: false }
    })
    const formatted = {
      id: updated.id,
      link: updated.link,
      createdAt: updated.createdAt.toISOString(),
      expiresAt: updated.expiresAt.toISOString(),
      maxUses: updated.maxUses,
      currentUses: updated.currentUses,
      createdBy: updated.createdBy,
      isActive: updated.isActive
    }
    res.json({ link: formatted })
  } catch (error) {
    console.error('Deactivate invite link error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /:linkId - remove an invite link
router.delete('/:linkId', async (req, res) => {
  try {
    const existing = await req.prisma.groupInviteLink.findUnique({
      where: { id: req.params.linkId }
    })
    if (!existing || existing.groupId !== req.params.groupId) {
      return res.status(404).json({ error: 'Link not found' })
    }
    await req.prisma.groupInviteLink.delete({ where: { id: existing.id } })
    res.json({})
  } catch (error) {
    console.error('Delete invite link error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
