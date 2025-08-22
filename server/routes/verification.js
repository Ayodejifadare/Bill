import express from 'express'
import authenticate from '../middleware/auth.js'
import { generateCode, cleanupExpiredCodes } from '../utils/verificationCodes.js'

const router = express.Router()

const getVerificationState = user => ({
  phoneVerified: user.phoneVerified,
  emailVerified: user.emailVerified,
  idVerified: user.idVerified,
  documentsSubmitted: user.documentsSubmitted
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
      const user = await req.prisma.user.findUnique({ where: { id: userId } })
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
      const user = await req.prisma.user.findUnique({ where: { id: userId } })
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
      const user = await req.prisma.user.findUnique({ where: { id: userId } })
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
      const user = await req.prisma.user.findUnique({ where: { id: userId } })
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
    const user = await req.prisma.user.findUnique({ where: { id: userId } })
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
    const user = await req.prisma.user.findUnique({ where: { id: userId } })
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
