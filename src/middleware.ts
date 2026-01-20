import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'unsic-secret-key-change-in-production'
);

// Ruoli che possono accedere a Fase 1 (news)
const FASE1_ROLES = ['giornalista', 'direttore'];
// Ruoli che possono accedere a Fase 2 (content)
const FASE2_ROLES = ['sviluppatore'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip login page and API routes (except protected ones)
  if (
    pathname === '/login' ||
    pathname.startsWith('/api/auth') ||
    pathname === '/' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  // Check if accessing dashboard
  if (pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      const role = payload.role as string;

      // Check role-based access
      if (pathname.startsWith('/dashboard/news')) {
        // Fase 1: Solo giornalista e direttore
        if (!FASE1_ROLES.includes(role)) {
          return NextResponse.redirect(new URL('/dashboard/content', request.url));
        }
      } else if (pathname.startsWith('/dashboard/content')) {
        // Fase 2: Solo sviluppatore
        if (!FASE2_ROLES.includes(role)) {
          return NextResponse.redirect(new URL('/dashboard/news', request.url));
        }
      }

      // Add user info to headers for server components
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', payload.userId as string);
      requestHeaders.set('x-user-role', role);
      requestHeaders.set('x-user-name', payload.displayName as string);

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch {
      // Invalid token
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
  ],
};
