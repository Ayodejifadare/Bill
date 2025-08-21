import express from 'express'
import jwt from 'jsonwebtoken'
import { broadcastUnreadCount } from '../utils/notifications.js'

const router = express.Router()

const defaultSettings = {
  whatsapp: { enabled: true },
  push: {
    enabled: true,
    billSplits: true,
    paymentRequests: true,
    paymentReceived: true,
    paymentReminders: true,
    friendRequests: true,
    groupActivity: true
  },
  email: {
    enabled: false,
    weeklyDigest: false,
    monthlyStatement: true,
    securityAlerts: true,
    productUpdates: false
  },
  sms: {
    enabled: false,
    paymentConfirmations: false,
    securityAlerts: true,
    urgentReminders: false
  }
}

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key')
    const user = await req.prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { tokenVersion: true }
    })
    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ error: 'Invalid token' })
    }
    req.userId = decoded.userId
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

// Get notification settings
router.get('/notification-settings', authenticateToken, async (req, res) => {
  try {
    let preference = await req.prisma.notificationPreference.findUnique({
      where: { userId: req.userId }
    })

    if (!preference) {
      preference = await req.prisma.notificationPreference.create({
        data: { userId: req.userId, preferences: defaultSettings }
      })
    }

    res.json({ settings: preference.preferences })
  } catch (error) {
    console.error('Get notification settings error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update notification settings
router.patch('/notification-settings', authenticateToken, async (req, res) => {
  try {
    const settings = req.body
    const preference = await req.prisma.notificationPreference.upsert({
      where: { userId: req.userId },
      update: { preferences: settings },
      create: { userId: req.userId, preferences: settings }
    })

    res.json({ settings: preference.preferences })
  } catch (error) {
    console.error('Update notification settings error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get notifications for a user
router.get('/notifications', authenticateToken, async (req, res) => {
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

// Get count of unread notifications
router.get('/notifications/unread', authenticateToken, async (req, res) => {
  try {
    const count = await req.prisma.notification.count({
      where: { recipientId: req.userId, read: false }
    })

    res.json({ count })
  } catch (error) {
    console.error('Get unread notifications count error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Mark a notification as read
router.patch('/notifications/:id/read', authenticateToken, async (req, res) => {
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
    await broadcastUnreadCount(req.prisma, req.userId)

    res.json({ notification: formatted })
  } catch (error) {
    console.error('Mark notification read error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Mark all notifications as read
router.patch('/notifications/mark-all-read', authenticateToken, async (req, res) => {
  try {
    const result = await req.prisma.notification.updateMany({
      where: { recipientId: req.userId, read: false },
      data: { read: true }
    })
    await broadcastUnreadCount(req.prisma, req.userId)

    res.json({ count: result.count })
  } catch (error) {
    console.error('Mark all notifications read error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

