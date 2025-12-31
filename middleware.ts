import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import { checkRateLimit, getClientIdentifier } from '@/lib/utils/rateLimit'

export default withAuth(
  function middleware(req) {
    // Apply rate limiting to auth endpoints
    if (req.nextUrl.pathname.startsWith('/api/auth/')) {
      const identifier = getClientIdentifier(req)
      const result = checkRateLimit(identifier, 10, 15 * 60 * 1000) // 10 requests per 15 minutes

      if (!result.allowed) {
        return NextResponse.json(
          {
            error: 'Too many requests',
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
          },
          {
            status: 429,
            headers: {
              'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
              'X-RateLimit-Limit': '10',
              'X-RateLimit-Remaining': result.remaining.toString(),
              'X-RateLimit-Reset': result.resetTime.toString()
            }
          }
        )
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    },
    pages: {
      signIn: '/login'
    }
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth routes)
     * - api/public (public API routes)
     * - login, signup (authentication pages)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api/auth|api/public|login|signup|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
}

