import express from 'express'
import jwt from 'jsonwebtoken'
import { body, validationResult } from 'express-validator'

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

// Get user settings
router.get('/:id/settings', authenticateToken, async (req, res) => {
  try {
    if (req.userId !== req.params.id) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const settings = await req.prisma.userSettings.findUnique({
      where: { userId: req.params.id }
    })

    if (!settings) {
      return res.json({ settings: {} })
    }

    res.json({
      settings: {
        notifications: settings.notifications ? JSON.parse(settings.notifications) : undefined,
        privacy: settings.privacy ? JSON.parse(settings.privacy) : undefined,
        preferences: settings.preferences ? JSON.parse(settings.preferences) : undefined
      }
    })
  } catch (error) {
    console.error('Get user settings error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update user settings
router.put(
  '/:id/settings',
  [
    authenticateToken,
    body('notifications').optional().isObject(),
    body('privacy').optional().isObject(),
    body('preferences').optional().isObject()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      if (req.userId !== req.params.id) {
        return res.status(403).json({ error: 'Unauthorized' })
      }

      const { notifications, privacy, preferences } = req.body
      const data = {}
      if (notifications !== undefined) data.notifications = JSON.stringify(notifications)
      if (privacy !== undefined) data.privacy = JSON.stringify(privacy)
      if (preferences !== undefined) data.preferences = JSON.stringify(preferences)

      const settings = await req.prisma.userSettings.upsert({
        where: { userId: req.params.id },
        update: data,
        create: { userId: req.params.id, ...data }
      })

      res.json({
        settings: {
          notifications: settings.notifications ? JSON.parse(settings.notifications) : undefined,
          privacy: settings.privacy ? JSON.parse(settings.privacy) : undefined,
          preferences: settings.preferences ? JSON.parse(settings.preferences) : undefined
        }
      })
    } catch (error) {
      console.error('Update user settings error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

export default router
