import express from 'express'
import authenticate from '../middleware/auth.js'

const router = express.Router()

// Get all recurring payments for the authenticated user
router.get('/', authenticate, async (req, res) => {
  try {
    const payments = await req.prisma.recurringPayment.findMany({
      where: { userId: req.user.id }
    })
    res.json(payments)
  } catch (error) {
    console.error('Get recurring payments error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create a new recurring payment
router.post('/', authenticate, async (req, res) => {
  try {
    const data = { ...req.body, userId: req.user.id }
    const payment = await req.prisma.recurringPayment.create({ data })
    res.status(201).json(payment)
  } catch (error) {
    console.error('Create recurring payment error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update an existing recurring payment
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const existing = await req.prisma.recurringPayment.findFirst({
      where: { id, userId: req.user.id }
    })
    if (!existing) {
      return res.status(404).json({ error: 'Recurring payment not found' })
    }
    const payment = await req.prisma.recurringPayment.update({
      where: { id },
      data: req.body
    })
    res.json(payment)
  } catch (error) {
    console.error('Update recurring payment error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Delete a recurring payment
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const existing = await req.prisma.recurringPayment.findFirst({
      where: { id, userId: req.user.id }
    })
    if (!existing) {
      return res.status(404).json({ error: 'Recurring payment not found' })
    }
    await req.prisma.recurringPayment.delete({ where: { id } })
    res.json({ success: true })
  } catch (error) {
    console.error('Delete recurring payment error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
