import express from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { body, validationResult } from 'express-validator'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { updateNotificationPreference, defaultSettings } from './notifications.js'
import authenticate from '../middleware/auth.js'
import { buildPhoneVariants } from '../utils/phone.js'

const VALID_LOOKUP_TYPES = new Set(['email', 'phone', 'username'])
const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,}$/
const PHONE_CANDIDATE_PATTERN = /^[-+()0-9\s.]+$/

function inferLookupType(value) {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.includes('@') && trimmed.split('@')[1]) return 'email'
  const numericCandidate = trimmed.replace(/[^0-9+]/g, '')
  if (numericCandidate.length >= 7 && PHONE_CANDIDATE_PATTERN.test(trimmed)) return 'phone'
  const noPrefix = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed
  if (USERNAME_PATTERN.test(noPrefix)) return 'username'
  return null
}

const { JWT_SECRET } = process.env
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not defined')
}

const router = express.Router()

const uploadDir = process.env.AVATAR_UPLOAD_DIR || 'uploads'
const useS3 = (process.env.AVATAR_STORAGE || '').toLowerCase() === 's3' || !!process.env.AWS_S3_BUCKET

let s3ClientPromise = null
const getS3Client = async () => {
  if (!useS3) {
    throw new Error('S3 storage not enabled')
  }
  if (!s3ClientPromise) {
    s3ClientPromise = (async () => {
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
      const client = new S3Client({
        region: process.env.AWS_S3_REGION || 'us-east-1',
        credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            }
          : undefined
      })
      return { client, PutObjectCommand }
    })()
  }
  return s3ClientPromise
}

const storage = useS3
  ? multer.memoryStorage()
  : multer.diskStorage({
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

router.use(authenticate)

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
router.get('/search', async (req, res) => {
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
              { email: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q, mode: 'insensitive' } }
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
router.get('/:id/payment-methods', async (req, res) => {
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
router.get('/:id/onboarding', async (req, res) => {
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
router.post('/:id/onboarding', async (req, res) => {
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
router.get('/:id', async (req, res) => {
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
router.get('/:id/stats', async (req, res) => {
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
router.post('/:id/avatar', upload.single('avatar'), async (req, res) => {
  try {
    if (req.userId !== req.params.id) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    let url
    if (useS3) {
      try {
        const { client, PutObjectCommand } = await getS3Client()
        const region = process.env.AWS_S3_REGION || 'us-east-1'
        const bucket = process.env.AWS_S3_BUCKET
        if (!bucket) {
          return res.status(500).json({ error: 'S3 bucket not configured' })
        }
        const prefix = (process.env.S3_PREFIX || 'uploads/avatars').replace(/^\/+|\/+$/g, '')
        const ext = path.extname(req.file.originalname || '') || '.jpg'
        const key = `${prefix}/${req.params.id}-${Date.now()}${ext}`

        await client.send(new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: req.file.buffer,
          ContentType: req.file.mimetype || 'image/jpeg',
          ACL: 'public-read'
        }))

        const publicBase = (process.env.S3_PUBLIC_BASE_URL || '').replace(/\/$/, '')
        const base = publicBase || `https://${bucket}.s3.${region}.amazonaws.com`
        url = `${base}/${key}`
      } catch (error) {
        console.error('S3 avatar upload failed:', error)
        return res.status(500).json({ error: 'Avatar upload failed. Ensure AWS SDK is installed or disable S3 storage.' })
      }
    } else {
      // Local disk fallback
      // Build a stable, https URL for the uploaded avatar
      const forwardedProto = (req.headers['x-forwarded-proto'] || '').toString().split(',')[0].trim()
      const detectedProto = forwardedProto || req.protocol || 'http'
      const host = req.get('host')
      const forceHttps = (process.env.FORCE_HTTPS ?? 'true') !== 'false'
      const protocol = forceHttps ? 'https' : detectedProto
      const base = process.env.PUBLIC_BASE_URL || `${protocol}://${host}`
      url = `${base}/uploads/${req.file.filename}`
    }

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
router.get('/:id/settings', async (req, res) => {
  try {
    if (req.userId !== req.params.id) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const user = await req.prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        twoFactorEnabled: true,
        biometricEnabled: true,
        preferenceSettings: true,
        region: true,
        currency: true,
      }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Load notifications from relation
    const pref = await req.prisma.notificationPreference.findUnique({ where: { userId: req.params.id } })
    const notifications = pref
      ? (typeof pref.preferences === 'string' ? JSON.parse(pref.preferences) : pref.preferences)
      : defaultSettings

    const privacy = {
      twoFactorAuth: !!user.twoFactorEnabled,
      biometricAuth: !!user.biometricEnabled,
    }
    let preferences = {}
    if (user.preferenceSettings) {
      if (typeof user.preferenceSettings === 'string') {
        try {
          preferences = JSON.parse(user.preferenceSettings)
        } catch (error) {
          console.warn('Failed to parse stored preferenceSettings JSON:', error)
          preferences = {}
        }
      } else if (typeof user.preferenceSettings === 'object') {
        preferences = user.preferenceSettings
      }
    }
    if (user.region) preferences.region = user.region
    if (user.currency) preferences.currency = user.currency

    res.json({ settings: { notifications, privacy, preferences } })
  } catch (error) {
    console.error('Get user settings error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update user settings
router.put('/:id/settings', async (req, res) => {
  try {
    if (req.userId !== req.params.id) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const { notifications, privacy, preferences } = req.body
    const data = {}
    if (privacy) {
      if (privacy.twoFactorAuth !== undefined) data.twoFactorEnabled = !!privacy.twoFactorAuth
      if (privacy.biometricAuth !== undefined) data.biometricEnabled = !!privacy.biometricAuth
    }
    if (preferences) {
      try {
        data.preferenceSettings = { set: JSON.stringify(preferences) }
      } catch {
        data.preferenceSettings = { set: JSON.stringify({}) }
      }
      if (preferences.region !== undefined) data.region = preferences.region
      if (preferences.currency !== undefined) data.currency = preferences.currency
    }

    const updatedUser = Object.keys(data).length
      ? await req.prisma.user.update({ where: { id: req.params.id }, data, select: {
          twoFactorEnabled: true,
          biometricEnabled: true,
          preferenceSettings: true,
          region: true,
          currency: true,
        } })
      : await req.prisma.user.findUnique({ where: { id: req.params.id }, select: {
          twoFactorEnabled: true,
          biometricEnabled: true,
          preferenceSettings: true,
          region: true,
          currency: true,
        } })

    // Update notifications via helper if provided
    let notificationsOut
    if (notifications) {
      notificationsOut = await updateNotificationPreference(req.prisma, req.params.id, notifications, false)
    } else {
      const pref = await req.prisma.notificationPreference.findUnique({ where: { userId: req.params.id } })
      notificationsOut = pref
        ? (typeof pref.preferences === 'string' ? JSON.parse(pref.preferences) : pref.preferences)
        : defaultSettings
    }

    const privacyOut = {
      twoFactorAuth: !!updatedUser.twoFactorEnabled,
      biometricAuth: !!updatedUser.biometricEnabled,
    }
    let preferencesOut = {}
    if (updatedUser.preferenceSettings) {
      if (typeof updatedUser.preferenceSettings === 'string') {
        try {
          preferencesOut = JSON.parse(updatedUser.preferenceSettings)
        } catch (error) {
          console.warn('Failed to parse updated preferenceSettings JSON:', error)
          preferencesOut = {}
        }
      } else if (typeof updatedUser.preferenceSettings === 'object') {
        preferencesOut = updatedUser.preferenceSettings
      }
    }
    if (updatedUser.region) preferencesOut.region = updatedUser.region
    if (updatedUser.currency) preferencesOut.currency = updatedUser.currency

    res.json({ settings: { notifications: notificationsOut, privacy: privacyOut, preferences: preferencesOut } })
  } catch (error) {
    console.error('Update user settings error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Change password
router.post(
  '/:id/change-password',
  [body('currentPassword').isString(), body('newPassword').isLength({ min: 6 })],
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
router.post('/:id/two-factor', async (req, res) => {
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
router.post('/:id/biometric', async (req, res) => {
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

router.get('/lookup', async (req, res) => {
  try {
    const rawIdentifier = typeof req.query.identifier === 'string' ? req.query.identifier.trim() : ''
    if (!rawIdentifier) {
      return res.status(400).json({ error: 'Identifier is required' })
    }

    const rawType = typeof req.query.type === 'string' ? req.query.type.trim().toLowerCase() : undefined
    if (rawType && !VALID_LOOKUP_TYPES.has(rawType)) {
      return res.status(400).json({ error: 'Invalid lookup type' })
    }

    const lookupType = rawType ?? inferLookupType(rawIdentifier) ?? 'email'
    const selectFields = { id: true, name: true, email: true, phone: true, avatar: true }

    let user = null
    if (lookupType === 'email') {
      user = await req.prisma.user.findFirst({
        where: { email: { equals: rawIdentifier, mode: 'insensitive' } },
        select: selectFields
      })
    } else if (lookupType === 'phone') {
      const currentUser = await req.prisma.user.findUnique({
        where: { id: req.userId },
        select: { region: true }
      })
      const variants = new Set(buildPhoneVariants(rawIdentifier, currentUser?.region || 'US'))
      const digitsOnly = rawIdentifier.replace(/\D/g, '')
      if (digitsOnly) {
        variants.add(digitsOnly)
        variants.add(`+${digitsOnly}`)
      }
      const phoneClauses = Array.from(variants)
        .filter(Boolean)
        .map(value => ({ phone: value }))
      if (!phoneClauses.length) {
        return res.json({ user: null })
      }
      user = await req.prisma.user.findFirst({
        where: { OR: phoneClauses },
        select: selectFields
      })
    } else if (lookupType === 'username') {
      const normalized = rawIdentifier.replace(/^@/, '').trim()
      if (!normalized) {
        return res.status(400).json({ error: 'Identifier is required' })
      }
      user = await req.prisma.user.findFirst({
        where: {
          OR: [
            { email: { equals: normalized, mode: 'insensitive' } },
            { email: { startsWith: `${normalized}@`, mode: 'insensitive' } },
            { name: { equals: normalized, mode: 'insensitive' } },
            { name: { contains: normalized, mode: 'insensitive' } },
            { id: normalized }
          ]
        },
        select: selectFields
      })
    }

    if (!user) {
      return res.json({ user: null })
    }

    let relationshipStatus = 'none'
    if (user.id === req.userId) {
      relationshipStatus = 'self'
    } else {
      const [friendship, outgoingRequest, incomingRequest] = await Promise.all([
        req.prisma.friendship.findFirst({
          where: {
            OR: [
              { user1Id: req.userId, user2Id: user.id },
              { user1Id: user.id, user2Id: req.userId }
            ]
          }
        }),
        req.prisma.friendRequest.findFirst({
          where: { senderId: req.userId, receiverId: user.id, status: 'PENDING' }
        }),
        req.prisma.friendRequest.findFirst({
          where: { senderId: user.id, receiverId: req.userId, status: 'PENDING' }
        })
      ])

      if (friendship) relationshipStatus = 'friends'
      else if (outgoingRequest) relationshipStatus = 'pending_outgoing'
      else if (incomingRequest) relationshipStatus = 'pending_incoming'
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        relationshipStatus,
        matchedBy: lookupType
      }
    })
  } catch (error) {
    console.error('Lookup user error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})


// Get security logs
router.get('/:id/security-logs', async (req, res) => {
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
router.post('/:id/logout-others', async (req, res) => {
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
      JWT_SECRET,
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
