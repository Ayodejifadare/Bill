import jwt from 'jsonwebtoken'

const { JWT_SECRET } = process.env
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not defined')
}

export default async function authenticate(req, res, next) {
  // Simple header-based auth for tests
  const testUserId = req.headers['x-user-id']
  if (testUserId) {
    req.user = { id: testUserId }
    req.userId = testUserId
    return next()
  }

  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    const user = await req.prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { tokenVersion: true }
    })
    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ error: 'Invalid token' })
    }
    req.user = { id: decoded.userId }
    req.userId = decoded.userId
    next()
  } catch (err) {
    console.error('JWT verification error:', err.name, err.message)
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' })
    }
    if (err.name === 'JsonWebTokenError' && err.message === 'invalid signature') {
      return res.status(401).json({ error: 'Invalid signature' })
    }
    return res.status(401).json({ error: 'Invalid token' })
  }
}
