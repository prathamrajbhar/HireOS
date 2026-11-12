import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

interface DecodedJwt {
  userId?: string;
  email?: string;
  role?: 'hr' | 'candidate';
  exp?: number;
}

function parseJwtPayload(token?: string): DecodedJwt | null {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonStr) as DecodedJwt;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  const accessToken = request.cookies.get('access_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;
  const userRoleCookie = request.cookies.get('user_role')?.value;

  const accessPayload = parseJwtPayload(accessToken);
  const refreshPayload = parseJwtPayload(refreshToken);

  const nowSeconds = Math.floor(Date.now() / 1000);
  const isAccessValid = !!accessPayload && (!accessPayload.exp || accessPayload.exp > nowSeconds);
  const isRefreshValid = !!refreshPayload && (!refreshPayload.exp || refreshPayload.exp > nowSeconds);
  const hasValidToken = isAccessValid || isRefreshValid;

  const resolvedRole: 'hr' | 'candidate' | null =
    (accessPayload?.role === 'hr' || accessPayload?.role === 'candidate' ? accessPayload.role : null) ||
    (refreshPayload?.role === 'hr' || refreshPayload?.role === 'candidate' ? refreshPayload.role : null) ||
    (userRoleCookie === 'hr' || userRoleCookie === 'candidate' ? userRoleCookie : null);

  const isExplicitAuthFlow =
    searchParams.get('logout') === 'true' ||
    searchParams.get('switch') === 'true' ||
    searchParams.get('force') === 'true';

  const clearAuthCookies = (res: NextResponse) => {
    res.cookies.delete('access_token');
    res.cookies.delete('refresh_token');
    res.cookies.delete('user_role');
    return res;
  };

  const redirectToLogin = (fromPath?: string) => {
    const loginUrl = new URL('/login', request.url);
    if (fromPath && fromPath !== '/' && fromPath !== '/login' && fromPath !== '/signup') {
      loginUrl.searchParams.set('from', fromPath);
    }
    const res = NextResponse.redirect(loginUrl);
    if (!hasValidToken && (accessToken || refreshToken || userRoleCookie)) {
      clearAuthCookies(res);
    }
    return res;
  };

  // Protect HR routes and HR onboarding
  if (pathname.startsWith('/hr') || pathname.startsWith('/onboarding/company')) {
    if (!hasValidToken) {
      return redirectToLogin(pathname);
    }
    if (resolvedRole === 'candidate') {
      return NextResponse.redirect(new URL('/candidate/dashboard', request.url));
    }
    if (resolvedRole !== 'hr') {
      // Role unknown or corrupted, clear and require login to avoid infinite redirect loops
      return redirectToLogin(pathname);
    }
  }

  // Protect Candidate routes and Candidate onboarding
  if (pathname.startsWith('/candidate') || pathname.startsWith('/onboarding/candidate')) {
    if (!hasValidToken) {
      return redirectToLogin(pathname);
    }
    if (resolvedRole === 'hr') {
      return NextResponse.redirect(new URL('/hr/dashboard', request.url));
    }
    if (resolvedRole !== 'candidate') {
      // Role unknown or corrupted, clear and require login to avoid infinite redirect loops
      return redirectToLogin(pathname);
    }
  }

  // Handle /login and /signup
  if (pathname === '/login' || pathname === '/signup') {
    if (isExplicitAuthFlow) {
      const res = NextResponse.next();
      if (searchParams.get('logout') === 'true') {
        clearAuthCookies(res);
      }
      return res;
    }

    if (hasValidToken && resolvedRole) {
      const targetDashboard = resolvedRole === 'hr' ? '/hr/dashboard' : '/candidate/dashboard';
      return NextResponse.redirect(new URL(targetDashboard, request.url));
    }

    // Token was invalid or expired, clean up stale cookies on response
    if (!hasValidToken && (accessToken || refreshToken || userRoleCookie)) {
      const res = NextResponse.next();
      clearAuthCookies(res);
      return res;
    }
  }

  return NextResponse.next();
}

export const middleware = proxy;

export const config = {
  matcher: [
    '/hr/:path*',
    '/candidate/:path*',
    '/login',
    '/signup',
    '/onboarding/:path*',
  ],
};
