export async function createNotification(prisma, { recipientId, actorId, type, title, message, amount, actionable }) {
  try {
    const data = { recipientId, type, title, message }
    if (actorId) data.actorId = actorId
    if (typeof amount !== 'undefined') data.amount = amount
    if (typeof actionable !== 'undefined') data.actionable = actionable
    return await prisma.notification.create({ data })
  } catch (error) {
    console.error('Create notification error:', error)
  }
}

export default createNotification
