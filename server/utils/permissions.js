export async function requireGroupMember(req, res, next) {
  try {
    const membership = await req.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: req.params.groupId,
          userId: req.user.id
        }
      }
    })
    if (!membership) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    req.membership = membership
    next()
  } catch (err) {
    console.error('Group membership check error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export async function requireGroupAdmin(req, res, next) {
  try {
    const membership = await req.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: req.params.groupId,
          userId: req.user.id
        }
      }
    })
    if (!membership || membership.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' })
    }
    req.membership = membership
    next()
  } catch (err) {
    console.error('Group admin check error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
