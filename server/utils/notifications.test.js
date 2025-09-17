/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./notificationStream.js', () => ({
  sendEvent: vi.fn()
}))

const { createNotification, broadcastUnreadCount } = await import('./notifications.js')
const { sendEvent } = await import('./notificationStream.js')

describe('notifications utils', () => {
  let prisma

  beforeEach(() => {
    prisma = {
      notification: {
        create: vi.fn(),
        count: vi.fn()
      }
    }
    vi.clearAllMocks()
  })

  describe('createNotification', () => {
    const baseData = {
      recipientId: 'recipient-1',
      type: 'info',
      title: 'Test',
      message: 'Hello'
    }

    it('includes optional fields and broadcasts unread count', async () => {
      const notification = { id: 'n1' }
      prisma.notification.create.mockResolvedValue(notification)
      prisma.notification.count.mockResolvedValue(5)

      const result = await createNotification(prisma, {
        ...baseData,
        actorId: 'actor-1',
        amount: 42,
        actionable: true
      })

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          recipientId: baseData.recipientId,
          type: baseData.type,
          title: baseData.title,
          message: baseData.message,
          actorId: 'actor-1',
          amount: 42,
          actionable: true,
          createdAt: expect.any(String)
        })
      })
      expect(result).toBe(notification)
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { recipientId: baseData.recipientId, read: false }
      })
      expect(sendEvent).toHaveBeenCalledWith(baseData.recipientId, { unread: 5 })
    })

    it('logs and swallows errors from prisma create', async () => {
      const error = new Error('fail to create')
      prisma.notification.create.mockRejectedValue(error)
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(
        createNotification(prisma, {
          ...baseData,
          actorId: 'actor-1'
        })
      ).resolves.toBeUndefined()

      expect(consoleSpy).toHaveBeenCalledWith('Create notification error:', error)
      expect(prisma.notification.count).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('broadcastUnreadCount', () => {
    it('publishes unread count via sendEvent', async () => {
      prisma.notification.count.mockResolvedValue(3)

      await broadcastUnreadCount(prisma, 'user-1')

      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { recipientId: 'user-1', read: false }
      })
      expect(sendEvent).toHaveBeenCalledWith('user-1', { unread: 3 })
    })

    it('logs and swallows errors when counting fails', async () => {
      const error = new Error('count failed')
      prisma.notification.count.mockRejectedValue(error)
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(broadcastUnreadCount(prisma, 'user-2')).resolves.toBeUndefined()

      expect(consoleSpy).toHaveBeenCalledWith('Broadcast unread count error:', error)
      expect(sendEvent).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })
})
