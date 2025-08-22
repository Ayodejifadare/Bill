import express from 'express'
import authenticate from '../middleware/auth.js'
import { broadcastUnreadCount } from '../utils/notifications.js'
import { addClient, removeClient } from '../utils/notificationStream.js'

const router = express.Router()
router.use(authenticate)

// Stream unread notification counts using Server-Sent Events
router.get('/notifications/stream', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  })
  res.flushHeaders()

  addClient(req.user.id, res)

  req.on('close', () => {
    removeClient(req.user.id)
  })
})

export const defaultSettings = {
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

export async function updateNotificationPreference(prisma, userId, settings, merge = true) {
  let preference = await prisma.notificationPreference.findUnique({ where: { userId } })
  const current = preference
    ? typeof preference.preferences === 'string'
      ? JSON.parse(preference.preferences)
      : preference.preferences
    : defaultSettings

  const next = merge ? { ...current } : { ...defaultSettings }
  for (const key of Object.keys(settings)) {
    next[key] = { ...(next[key] || {}), ...settings[key] }
  }

  const saved = await prisma.notificationPreference.upsert({
    where: { userId },
    update: { preferences: JSON.stringify(next) },
    create: { userId, preferences: JSON.stringify(next) }
  })

  return typeof saved.preferences === 'string'
    ? JSON.parse(saved.preferences)
    : saved.preferences
}

// Get notification settings
router.get('/notification-settings', async (req, res) => {
  try {
    let preference = await req.prisma.notificationPreference.findUnique({
      where: { userId: req.user.id }
    })

    if (!preference) {
      preference = await req.prisma.notificationPreference.create({
        data: {
          userId: req.user.id,
          preferences: JSON.stringify(defaultSettings)
        }
      })
    }

    const settings = typeof preference.preferences === 'string'
      ? JSON.parse(preference.preferences)
      : preference.preferences

    res.json({ settings })
  } catch (error) {
    console.error('Get notification settings error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update notification settings
router.patch('/notification-settings', async (req, res) => {
  try {
    const settings = req.body
    const updated = await updateNotificationPreference(req.prisma, req.user.id, settings, false)
    res.json({ settings: updated })
  } catch (error) {
    console.error('Update notification settings error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get notifications for a user
router.get('/notifications', async (req, res) => {
  try {
    const { filter } = req.query
    const where = { recipientId: req.user.id }
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
      time: new Date(n.createdAt).toISOString(),
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
router.get('/notifications/unread', async (req, res) => {
  try {
    const count = await req.prisma.notification.count({
      where: { recipientId: req.user.id, read: false }
    })

    res.json({ count })
  } catch (error) {
    console.error('Get unread notifications count error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Mark a notification as read
router.patch('/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params

    const notification = await req.prisma.notification.findUnique({
      where: { id },
      include: {
        actor: { select: { id: true, name: true, email: true, avatar: true } }
      }
    })

    if (!notification || notification.recipientId !== req.user.id) {
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
      time: new Date(notification.createdAt).toISOString(),
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
    await broadcastUnreadCount(req.prisma, req.user.id)

    res.json({ notification: formatted })
  } catch (error) {
    console.error('Mark notification read error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Mark all notifications as read
router.patch('/notifications/mark-all-read', async (req, res) => {
  try {
    const result = await req.prisma.notification.updateMany({
      where: { recipientId: req.user.id, read: false },
      data: { read: true }
    })
    await broadcastUnreadCount(req.prisma, req.user.id)

    res.json({ count: result.count })
  } catch (error) {
    console.error('Mark all notifications read error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

