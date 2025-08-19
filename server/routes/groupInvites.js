import express from 'express'

const router = express.Router({ mergeParams: true })

// GET / - list invites for a group
router.get('/', async (req, res) => {
  try {
    const invites = await req.prisma.groupInvite.findMany({
      where: { groupId: req.params.groupId }
    })

    const formatted = invites.map((i) => ({
      id: i.id,
      name: i.name || '',
      contact: i.contact,
      method: i.method,
      invitedBy: i.invitedBy,
      invitedAt: i.invitedAt.toISOString(),
      status: i.status,
      expiresAt: i.expiresAt.toISOString(),
      attempts: i.attempts,
      lastAttempt: i.lastAttempt ? i.lastAttempt.toISOString() : undefined
    }))

    res.json({ invites: formatted })
  } catch (error) {
    console.error('List group invites error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /:inviteId/resend - increment attempts and update status
router.post('/:inviteId/resend', async (req, res) => {
  try {
    const invite = await req.prisma.groupInvite.update({
      where: { id: req.params.inviteId },
      data: {
        attempts: { increment: 1 },
        status: 'delivered',
        lastAttempt: new Date()
      }
    })
    const formatted = {
      id: invite.id,
      name: invite.name || '',
      contact: invite.contact,
      method: invite.method,
      invitedBy: invite.invitedBy,
      invitedAt: invite.invitedAt.toISOString(),
      status: invite.status,
      expiresAt: invite.expiresAt.toISOString(),
      attempts: invite.attempts,
      lastAttempt: invite.lastAttempt?.toISOString()
    }
    res.json({ invite: formatted })
  } catch (error) {
    console.error('Resend invite error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /:inviteId - remove invite
router.delete('/:inviteId', async (req, res) => {
  try {
    await req.prisma.groupInvite.delete({ where: { id: req.params.inviteId } })
    res.json({})
  } catch (error) {
    console.error('Delete invite error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
