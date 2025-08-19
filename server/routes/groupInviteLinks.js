import express from 'express'
const router = express.Router({ mergeParams: true })

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
        createdBy: req.headers['x-user-id'] || 'system'
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

export default router
