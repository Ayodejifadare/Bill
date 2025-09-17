/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { requireGroupMember, requireGroupAdmin } from './permissions.js'

const createMockRes = () => {
  const res = {
    status: vi.fn(),
    json: vi.fn()
  }
  res.status.mockImplementation(() => res)
  return res
}

const createMockReq = () => ({
  params: { groupId: 'group-1' },
  user: { id: 'user-1' },
  prisma: {
    groupMember: {
      findUnique: vi.fn()
    }
  }
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('requireGroupMember', () => {
  it('attaches membership and calls next when user belongs to group', async () => {
    const membership = { id: 'gm-1', role: 'MEMBER' }
    const req = createMockReq()
    req.prisma.groupMember.findUnique.mockResolvedValue(membership)
    const res = createMockRes()
    const next = vi.fn()

    await requireGroupMember(req, res, next)

    expect(req.prisma.groupMember.findUnique).toHaveBeenCalledWith({
      where: {
        groupId_userId: {
          groupId: 'group-1',
          userId: 'user-1'
        }
      }
    })
    expect(req.membership).toBe(membership)
    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
    expect(res.json).not.toHaveBeenCalled()
  })

  it('returns 403 when user is not a group member', async () => {
    const req = createMockReq()
    req.prisma.groupMember.findUnique.mockResolvedValue(null)
    const res = createMockRes()
    const next = vi.fn()

    await requireGroupMember(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden' })
    expect(next).not.toHaveBeenCalled()
    expect(req.membership).toBeUndefined()
  })

  it('returns 500 when prisma throws an error', async () => {
    const req = createMockReq()
    req.prisma.groupMember.findUnique.mockRejectedValue(new Error('db failure'))
    const res = createMockRes()
    const next = vi.fn()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await requireGroupMember(req, res, next)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' })
    expect(next).not.toHaveBeenCalled()
    expect(consoleSpy).toHaveBeenCalled()
    expect(req.membership).toBeUndefined()
  })
})

describe('requireGroupAdmin', () => {
  it('allows admin members and calls next once', async () => {
    const membership = { id: 'gm-2', role: 'ADMIN' }
    const req = createMockReq()
    req.prisma.groupMember.findUnique.mockResolvedValue(membership)
    const res = createMockRes()
    const next = vi.fn()

    await requireGroupAdmin(req, res, next)

    expect(req.membership).toBe(membership)
    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })

  it('returns 403 when user is a non-admin member', async () => {
    const membership = { id: 'gm-3', role: 'MEMBER' }
    const req = createMockReq()
    req.prisma.groupMember.findUnique.mockResolvedValue(membership)
    const res = createMockRes()
    const next = vi.fn()

    await requireGroupAdmin(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden' })
    expect(next).not.toHaveBeenCalled()
    expect(req.membership).toBeUndefined()
  })

  it('returns 500 when prisma throws', async () => {
    const req = createMockReq()
    req.prisma.groupMember.findUnique.mockRejectedValue(new Error('query error'))
    const res = createMockRes()
    const next = vi.fn()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await requireGroupAdmin(req, res, next)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' })
    expect(next).not.toHaveBeenCalled()
    expect(consoleSpy).toHaveBeenCalled()
    expect(req.membership).toBeUndefined()
  })
})
