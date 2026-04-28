import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './lib/auth';

// Routes that don't require authentication
const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/register', '/api/inbound-sms'];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  // Check token from cookie
  const token = req.cookies.get('token')?.value;

  if (!token || !verifyToken(token)) {
    // Redirect API calls to 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Redirect page requests to login
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
