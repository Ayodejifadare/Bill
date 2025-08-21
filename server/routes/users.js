import express from 'express'
import jwt from 'jsonwebtoken'
import { body, validationResult } from 'express-validator'
import multer from 'multer'
import path from 'path'
import fs from 'fs'

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

// Temporary mock payment methods for recipients
const mockRecipientPaymentMethods = {
  'Sarah Johnson': {
    id: '1',
    type: 'bank',
    bank: 'Access Bank',
    accountNumber: '0123456789',
    accountName: 'Sarah Johnson',
    sortCode: '044',
    isDefault: true
  },
  'Mike Chen': {
    id: '2',
    type: 'mobile_money',
    provider: 'Opay',
    phoneNumber: '+234 801 234 5678',
    isDefault: true
  },
  'Emily Davis': {
    id: '3',
    type: 'bank',
    bank: 'Chase Bank',
    accountNumber: '****1234',
    accountName: 'Emily Davis',
    routingNumber: '021000021',
    accountType: 'checking',
    isDefault: true
  },
  'Alex Rodriguez': {
    id: '4',
    type: 'bank',
    bank: 'GTBank',
    accountNumber: '0234567890',
    accountName: 'Alex Rodriguez',
    sortCode: '058',
    isDefault: true
  }
}

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
    const method = mockRecipientPaymentMethods[req.params.id]
    res.json({ paymentMethods: method ? [method] : [] })
  } catch (error) {
    console.error('Get user payment methods error:', error)
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
        createdAt: true
      }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({ user })
  } catch (error) {
    console.error('Get user error:', error)
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
    body('bio').optional().isString().trim().notEmpty()
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

      const { name, email, phone, avatar, firstName, lastName, dateOfBirth, address, bio } = req.body
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

      if (Object.keys(data).length === 0) {
        return res.status(400).json({ error: 'No valid fields provided' })
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
          createdAt: true
        }
      })

      res.json({ user })
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

export default router
