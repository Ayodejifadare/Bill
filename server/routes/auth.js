import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { body, validationResult } from 'express-validator'
import { randomInt } from 'crypto'
import authenticate from '../middleware/auth.js'
import { defaultSettings as defaultNotificationSettings } from './notifications.js'

const { JWT_SECRET } = process.env
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not defined')
}

const router = express.Router()

// Normalize phone to a consistent E.164-like key for OTP store and DB lookup
function normalizePhone (input = '') {
  const digits = String(input).replace(/\D/g, '')
  // We assume the client includes country code; we only strip formatting/leading zeros
  const national = digits.replace(/^0+/, '')
  return `+${national}`
}

// Temporary store for OTPs
const otpStore = new Map()

const generateOtp = () => randomInt(0, 1_000_000).toString().padStart(6, '0')

async function sendSms (phone, otp) {
  // Replace with real SMS provider integration
  console.log(`Sending OTP ${otp} to ${phone}`)
}

// Request OTP
router.post('/request-otp', [
  body('phone').matches(/^\+?[1-9]\d{7,14}$/)
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { phone } = req.body
    const key = normalizePhone(phone)
    const otp = generateOtp()
    otpStore.set(key, { otp, expiresAt: Date.now() + 5 * 60 * 1000 })
    await sendSms(phone, otp)

    // In development, include OTP in response to simplify local testing
    const payload = { message: 'OTP sent' }
    if (process.env.NODE_ENV === 'development') {
      payload.otp = otp
    }
    res.json(payload)
  } catch (error) {
    console.error('OTP request error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Verify OTP
router.post('/verify-otp', [
  body('phone').matches(/^\+?[1-9]\d{7,14}$/),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be exactly 6 digits')
    .isNumeric()
    .withMessage('OTP must contain only numbers')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { phone, otp } = req.body
    const key = normalizePhone(phone)
    const entry = otpStore.get(key)
    if (!entry || entry.otp !== otp || entry.expiresAt < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired OTP' })
    }
    otpStore.delete(key)

    let user = await req.prisma.user.findFirst({ where: { phone: key } })
    if (!user) {
      if (process.env.NODE_ENV === 'development' || process.env.AUTO_CREATE_USER_ON_OTP === 'true') {
        const isNG = key.startsWith('+234')
        const region = isNG ? 'NG' : 'US'
        const currency = isNG ? 'NGN' : 'USD'
        const email = `otp_${key.replace(/\D/g, '')}@demo.local`
        try {
          user = await req.prisma.user.create({
            data: {
              email,
              name: 'Demo User',
              phone: key,
              region,
              currency,
              onboardingCompleted: true,
              password: '',
              tokenVersion: 0,
            }
          })
          // Ensure default notification preferences
          await req.prisma.notificationPreference.upsert({
            where: { userId: user.id },
            update: {},
            create: { userId: user.id, preferences: JSON.stringify(defaultNotificationSettings) }
          })
        } catch (e) {
          console.error('Auto-create user on OTP failed:', e)
          return res.status(404).json({ error: 'User not found' })
        }
      } else {
        return res.status(404).json({ error: 'User not found' })
      }
    }

    const token = jwt.sign(
      { userId: user.id, tokenVersion: user.tokenVersion },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    const { password: _, ...userWithoutPassword } = user

    res.json({
      message: 'OTP verified',
      user: userWithoutPassword,
      token
    })
  } catch (error) {
    console.error('OTP verification error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Register user
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().isLength({ min: 2 }),
  body('lastName').trim().isLength({ min: 2 }),
  body('phone').matches(/^\+?[1-9]\d{7,14}$/)
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { email, password, firstName, lastName, phone } = req.body

    const name = `${firstName} ${lastName}`.trim()

    // Check if user already exists
    const existingUser = await req.prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const user = await req.prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        firstName,
        lastName,
        phone
      },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        phone: true,
        balance: true,
        createdAt: true,
        phoneVerified: true,
        emailVerified: true,
        idVerified: true,
        documentsSubmitted: true,
        onboardingCompleted: true
      }
    })

    // Generate JWT token including token version
    const token = jwt.sign(
      { userId: user.id, tokenVersion: 0 },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.status(201).json({
      message: 'User created successfully',
      user,
      token
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Login user
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { email, password } = req.body

    // Find user
    const user = await req.prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' })
    }

    // Check password (handle invalid/legacy hashes gracefully)
    if (typeof user.password !== 'string' || !user.password.startsWith('$2')) {
      return res.status(400).json({ error: 'Invalid credentials' })
    }
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid credentials' })
    }

    // Generate JWT token including token version
    const token = jwt.sign(
      { userId: user.id, tokenVersion: user.tokenVersion },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user

    res.json({
      message: 'Login successful',
      user: userWithoutPassword,
      token
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await req.prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        name: true,
        balance: true,
        avatar: true,
        createdAt: true,
        tokenVersion: true,
        phoneVerified: true,
        emailVerified: true,
        idVerified: true,
        documentsSubmitted: true,
        onboardingCompleted: true
      }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({ user })
  } catch (error) {
    console.error('Auth error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Logout user by invalidating existing tokens
router.post('/logout', authenticate, async (req, res) => {
  try {
    await req.prisma.user.update({
      where: { id: req.userId },
      data: { tokenVersion: { increment: 1 } }
    })

    res.json({ message: 'Logged out' })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
