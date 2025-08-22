import express from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { body, validationResult } from 'express-validator'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { updateNotificationPreference, defaultSettings } from './notifications.js'

const router = express.Router()

const uploadDir = process.env.AVATAR_UPLOAD_DIR || 'uploads'
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(process.cwd(), uploadDir)
    fs.mkdirSync(dest, { recursive: true })
    cb(null, dest)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${req.userId}-${Date.now()}${ext}`)
  }
})
const upload = multer({ storage })

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

async function logSecurityEvent(prisma, userId, action, req) {
  try {
    await prisma.securityLog.create({
      data: {
        userId,
        action,
        device: req.headers['user-agent'] || '',
        location: req.ip || '',
        suspicious: false
      }
    })
  } catch (e) {
    console.error('Log security event error:', e)
  }
}

// Search users
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query
    
    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' })
    }

    const users = await req.prisma.user.findMany({
      where: {
        AND: [
          { id: { not: req.userId } }, // Exclude current user
          {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } }
            ]
          }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true
      },
      take: 10
    })

    res.json({ users })
  } catch (error) {
    console.error('Search users error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get payment methods for a specific user
router.get('/:id/payment-methods', authenticateToken, async (req, res) => {
  try {
    const methods = await req.prisma.paymentMethod.findMany({
      where: { userId: req.params.id }
    })
    res.json(methods)
  } catch (error) {
    console.error('Get user payment methods error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get onboarding state
router.get('/:id/onboarding', authenticateToken, async (req, res) => {
  try {
    if (req.userId !== req.params.id) {
      return res.status(403).json({ error: 'Unauthorized' })
    }
    const user = await req.prisma.user.findUnique({
      where: { id: req.params.id },
      select: { onboardingCompleted: true }
    })
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.json({ onboardingCompleted: user.onboardingCompleted })
  } catch (error) {
    console.error('Get onboarding error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update onboarding state
router.post('/:id/onboarding', authenticateToken, async (req, res) => {
  try {
    if (req.userId !== req.params.id) {
      return res.status(403).json({ error: 'Unauthorized' })
    }
    const { onboardingCompleted } = req.body
    const user = await req.prisma.user.update({
      where: { id: req.params.id },
      data: { onboardingCompleted: !!onboardingCompleted },
      select: { onboardingCompleted: true }
    })
    res.json({ onboardingCompleted: user.onboardingCompleted })
  } catch (error) {
    console.error('Update onboarding error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get user profile
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const user = await req.prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        avatar: true,
        dateOfBirth: true,
        address: true,
        bio: true,
        createdAt: true,
        twoFactorEnabled: true,
        biometricEnabled: true,
        preferenceSettings: true,
        region: true,
        currency: true,
        onboardingCompleted: true,
        kycStatus: true
      }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const notif = await req.prisma.notificationPreference.findUnique({ where: { userId: req.params.id } })
    const notificationSettings = notif
      ? typeof notif.preferences === 'string'
        ? JSON.parse(notif.preferences)
        : notif.preferences
      : defaultSettings

    const { preferenceSettings, ...rest } = user
    res.json({ user: { ...rest, preferences: { ...(preferenceSettings || {}), notificationSettings } } })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get user stats
router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    if (req.userId !== req.params.id) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const userId = req.params.id

    const [sentAgg, receivedAgg, splitsCount, friendsCount] = await req.prisma.$transaction([
      req.prisma.transaction.aggregate({
        where: { senderId: userId, status: 'COMPLETED' },
        _sum: { amount: true }
      }),
      req.prisma.transaction.aggregate({
        where: { receiverId: userId, status: 'COMPLETED' },
        _sum: { amount: true }
      }),
      req.prisma.billSplit.count({
        where: {
          OR: [
            { createdBy: userId },
            { participants: { some: { userId } } }
          ]
        }
      }),
      req.prisma.friendship.count({
        where: {
          OR: [{ user1Id: userId }, { user2Id: userId }]
        }
      })
    ])

    const totalSent = sentAgg._sum.amount || 0
    const totalReceived = receivedAgg._sum.amount || 0

    res.json({
      stats: {
        totalSent,
        totalReceived,
        totalSplits: splitsCount,
        friends: friendsCount
      }
    })
  } catch (error) {
    console.error('Get user stats error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Upload user avatar
router.post('/:id/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    if (req.userId !== req.params.id) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`

    await req.prisma.user.update({
      where: { id: req.params.id },
      data: { avatar: url }
    })

    res.json({ url })
  } catch (error) {
    console.error('Upload avatar error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update user profile
router.put(
  '/:id',
  [
    authenticateToken,
    body('name').optional().isString().trim().notEmpty(),
    body('email').optional().isEmail(),
    body('phone').optional().isString().trim().notEmpty(),
    body('avatar').optional().isURL(),
    body('firstName').optional().isString().trim().notEmpty(),
    body('lastName').optional().isString().trim().notEmpty(),
    body('dateOfBirth').optional().isISO8601(),
    body('address').optional().isString().trim().notEmpty(),
    body('bio').optional().isString().trim().notEmpty(),
    body('preferences').optional().isObject(),
    body('preferences.notifications').optional().isBoolean(),
    body('preferences.emailAlerts').optional().isBoolean(),
    body('preferences.whatsappAlerts').optional().isBoolean(),
    body('preferences.darkMode').optional().isBoolean(),
    body('preferences.biometrics').optional().isBoolean(),
    body('region').optional().isIn(['US', 'NG']),
    body('currency').optional().isIn(['USD', 'NGN'])
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

      const { name, email, phone, avatar, firstName, lastName, dateOfBirth, address, bio, preferences, region, currency } = req.body
      const data = {}
      if (name !== undefined) data.name = name
      if (email !== undefined) data.email = email
      if (phone !== undefined) data.phone = phone
      if (avatar !== undefined) data.avatar = avatar
      if (firstName !== undefined) data.firstName = firstName
      if (lastName !== undefined) data.lastName = lastName
      if (dateOfBirth !== undefined) data.dateOfBirth = new Date(dateOfBirth)
      if (address !== undefined) data.address = address
      if (bio !== undefined) data.bio = bio
      if (preferences !== undefined) data.preferenceSettings = preferences
      if (preferences?.biometrics !== undefined) data.biometricEnabled = preferences.biometrics
      if (region !== undefined) data.region = region
      if (currency !== undefined) data.currency = currency

      if (Object.keys(data).length === 0) {
        return res.status(400).json({ error: 'No valid fields provided' })
      }

      let notificationSettings
      if (preferences !== undefined) {
        const updates = {}
        if (preferences.notifications !== undefined) updates.push = { enabled: preferences.notifications }
        if (preferences.emailAlerts !== undefined) updates.email = { enabled: preferences.emailAlerts }
        if (preferences.whatsappAlerts !== undefined) updates.whatsapp = { enabled: preferences.whatsappAlerts }
        if (Object.keys(updates).length > 0) {
          notificationSettings = await updateNotificationPreference(req.prisma, req.params.id, updates)
        }
      }

      const user = await req.prisma.user.update({
        where: { id: req.params.id },
        data,
        select: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          avatar: true,
          dateOfBirth: true,
          address: true,
          bio: true,
          createdAt: true,
          preferenceSettings: true,
          biometricEnabled: true,
          region: true,
          currency: true,
          kycStatus: true
        }
      })

      if (!notificationSettings) {
        const pref = await req.prisma.notificationPreference.findUnique({ where: { userId: req.params.id } })
        notificationSettings = pref
          ? typeof pref.preferences === 'string'
            ? JSON.parse(pref.preferences)
            : pref.preferences
          : defaultSettings
      }

      const { preferenceSettings, ...rest } = user
      res.json({ user: { ...rest, preferences: { ...(preferenceSettings || {}), notificationSettings } } })
    } catch (error) {
      console.error('Update user error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

// Get user settings
router.get('/:id/settings', authenticateToken, async (req, res) => {
  try {
    if (req.userId !== req.params.id) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const user = await req.prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        notificationSettings: true,
        privacySettings: true,
        preferenceSettings: true
      }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({
      settings: {
        notifications: user.notificationSettings || {},
        privacy: user.privacySettings || {},
        preferences: user.preferenceSettings || {}
      }
    })
  } catch (error) {
    console.error('Get user settings error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update user settings
router.put('/:id/settings', authenticateToken, async (req, res) => {
  try {
    if (req.userId !== req.params.id) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const { notifications, privacy, preferences } = req.body
    const data = {}
    if (notifications !== undefined) data.notificationSettings = notifications
    if (privacy !== undefined) data.privacySettings = privacy
    if (preferences !== undefined) data.preferenceSettings = preferences

    const user = await req.prisma.user.update({
      where: { id: req.params.id },
      data,
      select: {
        notificationSettings: true,
        privacySettings: true,
        preferenceSettings: true
      }
    })

    res.json({
      settings: {
        notifications: user.notificationSettings || {},
        privacy: user.privacySettings || {},
        preferences: user.preferenceSettings || {}
      }
    })
  } catch (error) {
    console.error('Update user settings error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Change password
router.post(
  '/:id/change-password',
  [authenticateToken, body('currentPassword').isString(), body('newPassword').isLength({ min: 6 })],
  async (req, res) => {
    try {
      if (req.userId !== req.params.id) {
        return res.status(403).json({ error: 'Unauthorized' })
      }

      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const user = await req.prisma.user.findUnique({ where: { id: req.params.id } })
      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }

      const valid = await bcrypt.compare(req.body.currentPassword, user.password || '')
      if (!valid) {
        return res.status(400).json({ error: 'Invalid current password' })
      }

      const hashed = await bcrypt.hash(req.body.newPassword, 12)
      await req.prisma.user.update({ where: { id: req.params.id }, data: { password: hashed } })
      await logSecurityEvent(req.prisma, req.params.id, 'Password Changed', req)
      res.json({ message: 'Password updated successfully' })
    } catch (error) {
      console.error('Change password error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

// Toggle two-factor authentication
router.post('/:id/two-factor', authenticateToken, async (req, res) => {
  try {
    if (req.userId !== req.params.id) {
      return res.status(403).json({ error: 'Unauthorized' })
    }
    const enabled = !!req.body.enabled
    await req.prisma.user.update({ where: { id: req.params.id }, data: { twoFactorEnabled: enabled } })
    await logSecurityEvent(
      req.prisma,
      req.params.id,
      enabled ? 'Two-Factor Enabled' : 'Two-Factor Disabled',
      req
    )
    res.json({ twoFactorAuth: enabled })
  } catch (error) {
    console.error('Two-factor update error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Toggle biometric authentication
router.post('/:id/biometric', authenticateToken, async (req, res) => {
  try {
    if (req.userId !== req.params.id) {
      return res.status(403).json({ error: 'Unauthorized' })
    }
    const enabled = !!req.body.enabled
    await req.prisma.user.update({ where: { id: req.params.id }, data: { biometricEnabled: enabled } })
    await logSecurityEvent(
      req.prisma,
      req.params.id,
      enabled ? 'Biometric Enabled' : 'Biometric Disabled',
      req
    )
    res.json({ biometricAuth: enabled })
  } catch (error) {
    console.error('Biometric update error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get security logs
router.get('/:id/security-logs', authenticateToken, async (req, res) => {
  try {
    if (req.userId !== req.params.id) {
      return res.status(403).json({ error: 'Unauthorized' })
    }
    const logs = await req.prisma.securityLog.findMany({
      where: { userId: req.params.id },
      orderBy: { createdAt: 'desc' },
      take: 20
    })
    res.json({ logs })
  } catch (error) {
    console.error('Get security logs error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Log out other sessions
router.post('/:id/logout-others', authenticateToken, async (req, res) => {
  try {
    if (req.userId !== req.params.id) {
      return res.status(403).json({ error: 'Unauthorized' })
    }
    const user = await req.prisma.user.update({
      where: { id: req.params.id },
      data: { tokenVersion: { increment: 1 } },
      select: { id: true, tokenVersion: true }
    })
    const token = jwt.sign(
      { userId: user.id, tokenVersion: user.tokenVersion },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    )
    await logSecurityEvent(req.prisma, req.params.id, 'Logged out other sessions', req)
    res.json({ token })
  } catch (error) {
    console.error('Logout others error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

