import express from 'express'
import authenticate from '../middleware/auth.js'

const router = express.Router()

export function classifyStatus(dueDate) {
  const now = new Date()
  const soonThreshold = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const date = new Date(dueDate)
  if (date < now) return 'overdue'
  if (date <= soonThreshold) return 'due_soon'
  return 'upcoming'
}

router.get('/upcoming-payments', authenticate, async (req, res) => {
  try {
    const userId = req.user.id

    const billParticipants = await req.prisma.billSplitParticipant.findMany({
      where: { userId, isPaid: false },
      include: {
        billSplit: {
          include: {
            creator: { select: { id: true, name: true, email: true, avatar: true } },
            participants: {
              include: { user: { select: { id: true, name: true, email: true, avatar: true } } }
            }
          }
        }
      }
    })

    const billPayments = billParticipants.map((p) => {
      const dueDate = p.billSplit.date || p.billSplit.createdAt
      return {
        id: p.id,
        type: 'bill_split',
        title: p.billSplit.title,
        amount: p.amount,
        dueDate: dueDate.toISOString(),
        status: classifyStatus(dueDate),
        organizer: p.billSplit.creator,
        participants: p.billSplit.participants.map((part) => ({
          id: part.user.id,
          name: part.user.name,
          email: part.user.email,
          avatar: part.user.avatar,
          amount: part.amount,
          isPaid: part.isPaid
        })),
        billSplitId: p.billSplitId,
        paymentMethod: p.billSplit.paymentMethodId || null
      }
    })

    const requests = await req.prisma.transaction.findMany({
      where: { receiverId: userId, status: 'PENDING' },
      include: {
        sender: { select: { id: true, name: true, email: true, avatar: true } },
        receiver: { select: { id: true, name: true, email: true, avatar: true } }
      }
    })

    const requestPayments = requests.map((r) => {
      const dueDate = r.createdAt
      return {
        id: r.id,
        type: 'payment_request',
        title: r.description || 'Payment Request',
        amount: r.amount,
        dueDate: dueDate.toISOString(),
        status: classifyStatus(dueDate),
        organizer: r.sender,
        participants: [r.sender, r.receiver],
        requestId: r.id,
        paymentMethod: null
      }
    })

    let payments = [...billPayments, ...requestPayments]
    const { filter } = req.query
    if (filter) {
      payments = payments.filter((p) => p.status === filter)
    }

    res.json({ upcomingPayments: payments })
  } catch (error) {
    console.error('Get upcoming payments error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
