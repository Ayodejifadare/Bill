import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import { addClient, removeClient } from './utils/notificationStream.js'
import authenticate from './middleware/auth.js'

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

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000
const UPLOAD_DIR = process.env.AVATAR_UPLOAD_DIR || 'uploads'

// Initialize Prisma Client
const prisma = new PrismaClient()

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/bill-splits', billSplitRoutes)
app.use('/api/friends', friendRoutes)
app.use('/api/groups', groupRoutes)
app.use('/api/payment-methods', paymentMethodRoutes)
app.use('/api/requests', requestRoutes)
app.use('/api', upcomingPaymentRoutes)
app.use('/api', notificationRoutes)
app.use('/api/contacts', contactRoutes)

app.get('/api/notifications/stream', authenticate, (req, res) => {
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