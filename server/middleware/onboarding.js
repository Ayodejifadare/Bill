// Authentication is handled by auth middleware which sets `req.user` and `req.userId`.
// This middleware only checks the user's onboarding state and assumes any missing
// authentication has already been handled upstream.

// Middleware to gate access for users who haven't completed onboarding
// Instead of issuing a 307 redirect (problematic for fetch/SSE), return a
// clear API error and allow SSE streams to proceed.
export default async function onboardingRedirect(req, res, next) {
  // Environment-based bypasses to improve dev/test flows
  const skipInDev =
    process.env.SKIP_ONBOARDING_IN_DEV === "true" &&
    process.env.NODE_ENV === "development";
  const headerBypass = req.headers["x-skip-onboarding"] === "true";
  if (skipInDev || headerBypass) {
    return next();
  }
  // Allow auth routes, onboarding endpoints and SSE stream to proceed
  const isAuthRoute = req.path.startsWith("/auth");
  const isOnboardingEndpoint = /\/users\/[^/]+\/onboarding$/.test(req.path);
  const isSse =
    req.path === "/notifications/stream" ||
    (typeof req.headers.accept === "string" &&
      req.headers.accept.includes("text/event-stream"));

  if (isAuthRoute || isOnboardingEndpoint || isSse) {
    return next();
  }

  const userId = req.userId || req.user?.id;
  if (!userId) {
    // Authentication middleware will handle missing auth
    return next();
  }

  try {
    const user = await req.prisma.user.findUnique({
      where: { id: userId },
      select: { onboardingCompleted: true },
    });

    if (user && !user.onboardingCompleted) {
      return res.status(403).json({
        error: "onboarding_required",
        message:
          "User must complete onboarding before accessing this resource.",
        onboardingUrl: `/api/users/${userId}/onboarding`,
      });
    }
  } catch (err) {
    // Ignore errors – auth middleware or downstream handlers will manage errors
  }
  next();
}
