// Compute the next run date based on frequency and day
export function computeNextRun(frequency, day, from = new Date()) {
  const next = new Date(from)

  if (frequency === 'weekly') {
    const target = typeof day === 'number' ? day : 0
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

// Schedule cron job to process recurring bill splits
export async function scheduleRecurringBillSplits(prisma) {
  const cron = (await import('node-cron')).default
  // Check daily at midnight
  cron.schedule('0 0 * * *', async () => {
    const now = new Date()
    const dueSplits = await prisma.recurringBillSplit.findMany({
      where: { nextRun: { lte: now } },
      include: { billSplit: { include: { participants: true } } }
    })

    for (const rec of dueSplits) {
      await prisma.billSplit.create({
        data: {
          title: rec.billSplit.title,
          description: rec.billSplit.description,
          totalAmount: rec.billSplit.totalAmount,
          createdBy: rec.billSplit.createdBy,
          groupId: rec.billSplit.groupId,
          splitMethod: rec.billSplit.splitMethod,
          paymentMethodId: rec.billSplit.paymentMethodId,
          participants: {
            create: rec.billSplit.participants.map(p => ({
              userId: p.userId,
              amount: p.amount
            }))
          }
        }
      })

      const nextRun = computeNextRun(rec.frequency, rec.day, rec.nextRun)
      await prisma.recurringBillSplit.update({
        where: { id: rec.id },
        data: { nextRun }
      })
    }
  })
}

export default scheduleRecurringBillSplits

