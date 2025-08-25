import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import authenticate from './middleware/auth.js'
import onboardingRedirect from './middleware/onboarding.js'
import { DEV_JWT_SECRET } from './dev-jwt-secret.js'

// Import routes
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import transactionRoutes from './routes/transactions.js'
import billSplitRoutes from './routes/billSplits.js'
import friendRoutes from './routes/friends.js'
import groupRoutes from './routes/groups.js'
import notificationRoutes from './routes/notifications.js'
import paymentMethodRoutes from './routes/paymentMethods.js'
import upcomingPaymentRoutes from './routes/upcomingPayments.js'
import requestRoutes from './routes/requests.js'
import contactRoutes from './routes/contacts.js'
import verificationRoutes from './routes/verification.js'
import receiptRoutes from './routes/receipts.js'
import spendingInsightsRoutes from './routes/spendingInsights.js'
import recurringPaymentRoutes from './routes/recurringPayments.js'
import { cleanupExpiredCodes } from './utils/verificationCodes.js'
import { scheduleRecurringBillSplits } from './utils/recurringBillSplitScheduler.js'
import { scheduleRecurringRequests } from './utils/recurringRequestScheduler.js'

// Load environment variables
dotenv.config()

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = DEV_JWT_SECRET
}

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not defined')
}

const app = express()
const PORT = process.env.PORT || 5000
const UPLOAD_DIR = process.env.AVATAR_UPLOAD_DIR || 'uploads'

// Initialize Prisma Client
const prisma = new PrismaClient()

// Setup recurring bill split scheduler
scheduleRecurringBillSplits(prisma)
scheduleRecurringRequests(prisma)

// Periodically remove expired verification codes
setInterval(() => cleanupExpiredCodes(prisma), 60 * 60 * 1000)

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4000',
  credentials: true
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
})
app.use('/api/', limiter)

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use('/uploads', express.static(path.join(process.cwd(), UPLOAD_DIR)))

// Make prisma available in req object
app.use((req, res, next) => {
  req.prisma = prisma
  next()
})

// Auth routes (login, register, OTP)
app.use('/api/auth', authRoutes)
// Protect all other API routes with authentication
app.use('/api', authenticate)
// Redirect first-time users to onboarding if needed
app.use('/api', onboardingRedirect)
app.use('/api/users', userRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/bill-splits', billSplitRoutes)
app.use('/api/friends', friendRoutes)
app.use('/api/groups', groupRoutes)
app.use('/api/payment-methods', paymentMethodRoutes)
app.use('/api/requests', requestRoutes)
app.use('/api/recurring-payments', recurringPaymentRoutes)
app.use('/api', upcomingPaymentRoutes)
app.use('/api', notificationRoutes)
app.use('/api/contacts', contactRoutes)
app.use('/api/verification', verificationRoutes)
app.use('/api/receipts', receiptRoutes)
app.use('/api', spendingInsightsRoutes)


// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully')
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully')
  await prisma.$disconnect()
  process.exit(0)
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
})