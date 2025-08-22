import express from 'express'
import authenticate from '../middleware/auth.js'

const router = express.Router()

const phoneCodes = new Map()
const emailCodes = new Map()
const CODE = '123456'

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

    if (!code) {
      phoneCodes.set(userId, { code: CODE, phone })
      const user = await req.prisma.user.findUnique({ where: { id: userId } })
      return res.json({
        message: 'Verification code sent',
        verification: getVerificationState(user)
      })
    }

    const entry = phoneCodes.get(userId)
    if (entry && entry.code === code) {
      await req.prisma.user.update({
        where: { id: userId },
        data: { phoneVerified: true, phone: entry.phone || phone }
      })
      phoneCodes.delete(userId)
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

    if (!code) {
      emailCodes.set(userId, { code: CODE, email })
      const user = await req.prisma.user.findUnique({ where: { id: userId } })
      return res.json({
        message: 'Verification code sent',
        verification: getVerificationState(user)
      })
    }

    const entry = emailCodes.get(userId)
    if (entry && entry.code === code) {
      await req.prisma.user.update({
        where: { id: userId },
        data: { emailVerified: true, email: entry.email || email }
      })
      emailCodes.delete(userId)
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

export default router
