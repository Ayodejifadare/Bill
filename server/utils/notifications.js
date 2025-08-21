import { sendEvent } from './notificationStream.js'

export async function createNotification(
  prisma,
  { recipientId, actorId, type, title, message, amount, actionable }
) {
  try {
    const data = {
      recipientId,
      type,
      title,
      message,
      createdAt: new Date().toISOString()
    }
    if (actorId) data.actorId = actorId
    if (typeof amount !== 'undefined') data.amount = amount
    if (typeof actionable !== 'undefined') data.actionable = actionable
    const notification = await prisma.notification.create({ data })

    await broadcastUnreadCount(prisma, recipientId)

    return notification
  } catch (error) {
    console.error('Create notification error:', error)
  }
}

export async function broadcastUnreadCount(prisma, userId) {
  try {
    const count = await prisma.notification.count({
      where: { recipientId: userId, read: false }
    })
    sendEvent(userId, { unread: count })
  } catch (error) {
    console.error('Broadcast unread count error:', error)
  }
}

export default createNotification
