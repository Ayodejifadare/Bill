import express from 'express'
import rateLimit from 'express-rate-limit'
import authenticate from '../middleware/auth.js'
import { generateCode, cleanupExpiredCodes } from '../utils/verificationCodes.js'

const router = express.Router()

const getVerificationState = user => ({
  phoneVerified: user.phoneVerified,
  emailVerified: user.emailVerified,
  idVerified: user.idVerified,
  documentsSubmitted: user.documentsSubmitted,
  kycStatus: user.kycStatus
})

const updateKycStatus = async (prisma, userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  const complete =
    user.phoneVerified &&
    user.emailVerified &&
    user.idVerified &&
    user.documentsSubmitted
  const kycStatus = complete ? 'verified' : 'pending'
  if (user.kycStatus !== kycStatus) {
    return prisma.user.update({ where: { id: userId }, data: { kycStatus } })
  }
  return user
}

const phoneResendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: 'Too many resend attempts. Please try again later.',
  keyGenerator: req => req.user.id
})

router.post('/phone', authenticate, async (req, res) => {
  try {
    const userId = req.user.id
    const { phone, code } = req.body

    await cleanupExpiredCodes(req.prisma)

    if (!code) {
      const generated = generateCode()
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
      await req.prisma.verificationCode.upsert({
        where: { userId_type: { userId, type: 'phone' } },
        update: { code: generated, target: phone, expiresAt },
        create: { userId, type: 'phone', code: generated, target: phone, expiresAt }
      })
      const user = await updateKycStatus(req.prisma, userId)
      return res.json({
        message: 'Verification code sent',
        verification: getVerificationState(user)
      })
    }

    const entry = await req.prisma.verificationCode.findUnique({
      where: { userId_type: { userId, type: 'phone' } }
    })

    if (entry && entry.code === code && entry.expiresAt > new Date()) {
      await req.prisma.user.update({
        where: { id: userId },
        data: { phoneVerified: true, phone: entry.target || phone }
      })
      await req.prisma.verificationCode.delete({ where: { id: entry.id } })
      const user = await updateKycStatus(req.prisma, userId)
      return res.json({
        message: 'Phone verified',
        verification: getVerificationState(user)
      })
    }

    return res.status(400).json({ error: 'Invalid code' })
  } catch (error) {
    console.error('Phone verification error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/phone/resend', authenticate, phoneResendLimiter, async (req, res) => {
  try {
    const userId = req.user.id

    await cleanupExpiredCodes(req.prisma)

    const existing = await req.prisma.verificationCode.findUnique({
      where: { userId_type: { userId, type: 'phone' } }
    })

    if (!existing) {
      return res.status(404).json({ error: 'No phone verification in progress' })
    }

    const generated = generateCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
    await req.prisma.verificationCode.update({
      where: { id: existing.id },
      data: { code: generated, expiresAt }
    })

    const phone = existing.target
    console.log(`Resending verification code ${generated} to ${phone}`)

    const user = await updateKycStatus(req.prisma, userId)
    return res.json({
      message: 'Verification code resent',
      verification: getVerificationState(user)
    })
  } catch (error) {
    console.error('Phone verification resend error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/email', authenticate, async (req, res) => {
  try {
    const userId = req.user.id
    const { email, code } = req.body

    await cleanupExpiredCodes(req.prisma)

    if (!code) {
      const generated = generateCode()
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
      await req.prisma.verificationCode.upsert({
        where: { userId_type: { userId, type: 'email' } },
        update: { code: generated, target: email, expiresAt },
        create: { userId, type: 'email', code: generated, target: email, expiresAt }
      })
      const user = await updateKycStatus(req.prisma, userId)
      return res.json({
        message: 'Verification code sent',
        verification: getVerificationState(user)
      })
    }

    const entry = await req.prisma.verificationCode.findUnique({
      where: { userId_type: { userId, type: 'email' } }
    })

    if (entry && entry.code === code && entry.expiresAt > new Date()) {
      await req.prisma.user.update({
        where: { id: userId },
        data: { emailVerified: true, email: entry.target || email }
      })
      await req.prisma.verificationCode.delete({ where: { id: entry.id } })
      const user = await updateKycStatus(req.prisma, userId)
      return res.json({
        message: 'Email verified',
        verification: getVerificationState(user)
      })
    }

    return res.status(400).json({ error: 'Invalid code' })
  } catch (error) {
    console.error('Email verification error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/id', authenticate, async (req, res) => {
  try {
    const userId = req.user.id
    await req.prisma.user.update({
      where: { id: userId },
      data: { idVerified: true }
    })
    const user = await updateKycStatus(req.prisma, userId)
    res.json({
      message: 'ID submitted',
      verification: getVerificationState(user)
    })
  } catch (error) {
    console.error('ID verification error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/documents', authenticate, async (req, res) => {
  try {
    const userId = req.user.id
    await req.prisma.user.update({
      where: { id: userId },
      data: { documentsSubmitted: true }
    })
    const user = await updateKycStatus(req.prisma, userId)
    res.json({
      message: 'Documents submitted',
      verification: getVerificationState(user)
    })
  } catch (error) {
    console.error('Document submission error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/cleanup', authenticate, async (req, res) => {
  try {
    await cleanupExpiredCodes(req.prisma)
    res.json({ message: 'Expired codes cleaned' })
  } catch (error) {
    console.error('Cleanup verification code error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
