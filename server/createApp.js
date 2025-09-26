import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import authenticate from './middleware/auth.js'
import onboardingRedirect from './middleware/onboarding.js'

// Routes
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
import transferRoutes from './routes/transfers.js'
import { cleanupExpiredCodes } from './utils/verificationCodes.js'
import { initSchedulers } from './utils/schedulerInit.js'

dotenv.config()

function getPrisma() {
  const g = globalThis
  if (!g.__prisma) {
    g.__prisma = new PrismaClient()
  }
  return g.__prisma
}

export default function createApp({ enableSchedulers = true } = {}) {
  if (!process.env.JWT_SECRET) {
    // In serverless, fail fast with a clear error
    throw new Error('JWT_SECRET environment variable is not defined')
  }

  const app = express()
  const UPLOAD_DIR = process.env.AVATAR_UPLOAD_DIR || 'uploads'

  // Initialize Prisma Client
  const prisma = getPrisma()

  // Background jobs only in long-lived environments
  if (enableSchedulers && process.env.ENABLE_SCHEDULERS !== 'false') {
    initSchedulers(prisma)
    // Periodic cleanup is handled here; serverless deployments should disable schedulers
    setInterval(() => cleanupExpiredCodes(prisma), 60 * 60 * 1000)
  }

  // Middleware
  app.use(helmet())

  const defaultFrontend = 'http://localhost:4000'
  const configuredFrontend = process.env.FRONTEND_URL || defaultFrontend
  const devOrigins = [configuredFrontend, 'http://localhost:4000', 'http://localhost:3000']
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true)
      const allowed = process.env.NODE_ENV === 'development'
        ? devOrigins.includes(origin)
        : origin === configuredFrontend
      callback(null, allowed)
    },
    credentials: true
  }))

  const rateLimitEnabled = (process.env.RATE_LIMIT_ENABLED ?? (process.env.NODE_ENV !== 'development' ? 'true' : 'false')) !== 'false'
  if (rateLimitEnabled) {
    const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? (15 * 60 * 1000))
    const max = Number(process.env.RATE_LIMIT_MAX ?? 300)
    const limiter = rateLimit({
      windowMs,
      max,
      standardHeaders: true,
      legacyHeaders: false,
      message: 'Too many requests from this IP, please try again later.',
      skip: (req) => req.method === 'OPTIONS' || req.path === '/notifications/stream'
    })
    app.use('/api', limiter)
  }

  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))
  app.use('/uploads', express.static(path.join(process.cwd(), UPLOAD_DIR), {
    maxAge: '7d',
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable')
    }
  }))

  // Attach prisma to req
  app.use((req, res, next) => {
    req.prisma = prisma
    next()
  })

  // Lightweight health check before protected routes so Render can verify the service
  app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString(), uptime: process.uptime() })
  })

  // Routes
  app.use('/api/auth', authRoutes)
  app.use('/api', authenticate)
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
  app.use('/api', transferRoutes)

  app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).json({ error: 'Something went wrong!', message: process.env.NODE_ENV === 'development' ? err.message : undefined })
  })

  app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' })
  })

  return { app, prisma }
}
