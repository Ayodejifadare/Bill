import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { body, validationResult } from 'express-validator'
import { randomInt } from 'crypto'

const { JWT_SECRET } = process.env
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not defined')
}

const router = express.Router()

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
    const otp = generateOtp()
    otpStore.set(phone, { otp, expiresAt: Date.now() + 5 * 60 * 1000 })
    await sendSms(phone, otp)

    res.json({ message: 'OTP sent' })
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
    const entry = otpStore.get(phone)
    if (!entry || entry.otp !== otp || entry.expiresAt < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired OTP' })
    }
    otpStore.delete(phone)

    const user = await req.prisma.user.findFirst({ where: { phone } })
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
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

    // Check password
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
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const decoded = jwt.verify(token, JWT_SECRET)
    const user = await req.prisma.user.findUnique({
      where: { id: decoded.userId },
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

    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ error: 'User not found' })
    }

    res.json({ user })
  } catch (error) {
    console.error('Auth error:', error)
    res.status(401).json({ error: 'Invalid token' })
  }
})

// Logout user by invalidating existing tokens
router.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const decoded = jwt.verify(token, JWT_SECRET)
    await req.prisma.user.update({
      where: { id: decoded.userId },
      data: { tokenVersion: { increment: 1 } }
    })

    res.json({ message: 'Logged out' })
  } catch (error) {
    console.error('Logout error:', error)
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      res.status(401).json({ error: 'Invalid token' })
    } else {
      res.status(500).json({ error: 'Internal server error' })
    }
  }
})

export default router
