import express from 'express'
import jwt from 'jsonwebtoken'

const router = express.Router()

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key')
    req.userId = decoded.userId
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

// Get notifications for a user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { filter } = req.query
    const where = { recipientId: req.userId }
    if (filter === 'unread') {
      where.read = false
    }

    const notifications = await req.prisma.notification.findMany({
      where,
      include: {
        actor: { select: { id: true, name: true, email: true, avatar: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    const formatted = notifications.map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      time: n.createdAt,
      read: n.read,
      actionable: n.actionable,
      user: n.actor
        ? { id: n.actor.id, name: n.actor.name, email: n.actor.email, avatar: n.actor.avatar }
        : null,
      amount: n.amount
    }))

    res.json({ notifications: formatted })
  } catch (error) {
    console.error('Get notifications error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Mark a notification as read
router.patch('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    const notification = await req.prisma.notification.findUnique({
      where: { id },
      include: {
        actor: { select: { id: true, name: true, email: true, avatar: true } }
      }
    })

    if (!notification || notification.recipientId !== req.userId) {
      return res.status(404).json({ error: 'Notification not found' })
    }

    if (!notification.read) {
      await req.prisma.notification.update({
        where: { id },
        data: { read: true }
      })
      notification.read = true
    }

    const formatted = {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      time: notification.createdAt,
      read: notification.read,
      actionable: notification.actionable,
      user: notification.actor
        ? {
            id: notification.actor.id,
            name: notification.actor.name,
            email: notification.actor.email,
            avatar: notification.actor.avatar
          }
        : null,
      amount: notification.amount
    }

    res.json({ notification: formatted })
  } catch (error) {
    console.error('Mark notification read error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Mark all notifications as read
router.patch('/mark-all-read', authenticateToken, async (req, res) => {
  try {
    const result = await req.prisma.notification.updateMany({
      where: { recipientId: req.userId, read: false },
      data: { read: true }
    })

    res.json({ count: result.count })
  } catch (error) {
    console.error('Mark all notifications read error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

