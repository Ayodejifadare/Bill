import jwt from 'jsonwebtoken'

export default async function authenticate(req, res, next) {
  // Try JWT auth first
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key')
      if (req.prisma) {
        const user = await req.prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { tokenVersion: true }
        })
        if (!user || user.tokenVersion !== decoded.tokenVersion) {
          return res.status(401).json({ error: 'Invalid token' })
        }
      }
      req.user = { id: decoded.userId }
      return next()
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' })
    }
  }

  // Fallback to x-user-id header (for tests and legacy support)
  const userId = req.headers['x-user-id']
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  req.user = { id: userId }
  next()
}
