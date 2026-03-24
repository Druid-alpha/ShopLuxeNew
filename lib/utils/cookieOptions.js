module.exports = (maxAge) => {
  const isProd = process.env.NODE_ENV === "production";

  return ({
    httpOnly: true,

    // Use secure cookies only in production HTTPS
    secure: isProd,

    // Cross-site cookies are only allowed with secure=true in production
    sameSite: isProd ? "none" : "lax",

  // Ensure cookie is available for all routes
  path: "/",

  // Optional explicit domain (set COOKIE_DOMAIN in env if needed)
  ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),

    ...(maxAge ? { maxAge } : {})
  })
}
