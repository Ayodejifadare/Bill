// Utility functions and scheduler for recurring payment requests
export function computeNextDueDate(frequency, day, dayOfWeek, from = new Date()) {
  const next = new Date(from)

  if (frequency === 'weekly') {
    const target = typeof dayOfWeek === 'number' ? dayOfWeek : 0
    const diff = (target - next.getDay() + 7) % 7 || 7
    next.setDate(next.getDate() + diff)
  } else if (frequency === 'monthly') {
    const target = typeof day === 'number' ? day : 1
    next.setMonth(next.getMonth() + (next.getDate() >= target ? 1 : 0))
    next.setDate(target)
  } else {
    next.setDate(next.getDate() + 1)
  }

  next.setHours(0, 0, 0, 0)
  return next
}

import { recurringRequestQueue } from './taskQueue.js'

export async function scheduleRecurringRequests(prisma) {
  const cron = (await import('node-cron')).default

  // Worker to process queued recurring requests
  recurringRequestQueue.process(async job => {
    const req = job.data
    try {
      await prisma.paymentRequest.create({
        data: {
          senderId: req.senderId,
          receiverId: req.receiverId,
          amount: req.amount,
          description: req.description,
          message: req.message,
          status: 'PENDING',
          isRecurring: true,
          recurringFrequency: req.recurringFrequency,
          recurringDay: req.recurringDay,
          recurringDayOfWeek: req.recurringDayOfWeek,
          nextDueDate: computeNextDueDate(
            req.recurringFrequency,
            req.recurringDay,
            req.recurringDayOfWeek,
            req.nextDueDate
          )
        }
      })

      await prisma.paymentRequest.update({
        where: { id: req.id },
        data: { nextDueDate: null }
      })
    } catch (err) {
      console.error('Failed to process recurring request job', err)
    }
  })

  // Check daily at midnight
  cron.schedule('0 0 * * *', async () => {
    try {
      const now = new Date()
      const dueRequests = await prisma.paymentRequest.findMany({
        where: { isRecurring: true, nextDueDate: { lte: now } }
      })

      for (const req of dueRequests) {
        // jobId ensures only one instance processes this request
        await recurringRequestQueue.add(req, { jobId: `recurring-request-${req.id}` })
      }
    } catch (err) {
      console.error('Error scheduling recurring requests', err)
    }
  })
}

