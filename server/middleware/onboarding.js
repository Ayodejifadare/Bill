import jwt from 'jsonwebtoken'

const { JWT_SECRET } = process.env
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not defined')
}

// Middleware to gate access for users who haven't completed onboarding
// Instead of issuing a 307 redirect (problematic for fetch/SSE), return a
// clear API error and allow SSE streams to proceed.
export default async function onboardingRedirect(req, res, next) {
  // Environment-based bypasses to improve dev/test flows
  const skipInDev = process.env.SKIP_ONBOARDING_IN_DEV === 'true' && process.env.NODE_ENV === 'development'
  const headerBypass = req.headers['x-skip-onboarding'] === 'true'
  if (skipInDev || headerBypass) {
    return next()
  }
  // Allow auth routes, onboarding endpoints and SSE stream to proceed
  const isAuthRoute = req.path.startsWith('/auth')
  const isOnboardingEndpoint = /\/users\/[^/]+\/onboarding$/.test(req.path)
  const isSse = req.path === '/notifications/stream' ||
    (typeof req.headers.accept === 'string' && req.headers.accept.includes('text/event-stream'))

  if (isAuthRoute || isOnboardingEndpoint || isSse) {
    return next()
  }

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return next()
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    const user = await req.prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { onboardingCompleted: true }
    })

    if (user && !user.onboardingCompleted) {
      return res.status(403).json({
        error: 'onboarding_required',
        message: 'User must complete onboarding before accessing this resource.',
        onboardingUrl: `/api/users/${decoded.userId}/onboarding`
      })
    }
  } catch (err) {
    // Ignore errors – authentication middleware will handle them
  }
  next()
}
