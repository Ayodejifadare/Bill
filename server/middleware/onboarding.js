import jwt from 'jsonwebtoken'

// Middleware to redirect users who haven't completed onboarding
export default async function onboardingRedirect(req, res, next) {
  // Allow auth routes and onboarding endpoints to proceed
  if (req.path.startsWith('/auth') || /\/users\/[^/]+\/onboarding$/.test(req.path)) {
    return next()
  }

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return next()
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key')
    const user = await req.prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { onboardingCompleted: true }
    })

    if (user && !user.onboardingCompleted) {
      return res.status(307).json({ redirect: `/api/users/${decoded.userId}/onboarding` })
    }
  } catch (err) {
    // Ignore errors – authentication middleware will handle them
  }
  next()
}
