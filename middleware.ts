import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Super admin and admin emails (must match lib/admin.ts)
const SUPER_ADMIN_EMAILS = ['andrew.antoshkin@gmail.com'];
const ADMIN_EMAILS = ['antonbmx@list.ru'];

function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const emailLower = email.toLowerCase();
  return SUPER_ADMIN_EMAILS.includes(emailLower) || ADMIN_EMAILS.includes(emailLower);
}

// Protected routes that require auth check
const PROTECTED_PATHS = ['/', '/history', '/result', '/video', '/analyze'];

// Admin routes that require admin access
const ADMIN_PATHS = ['/admin'];

// Check if path needs auth verification
function needsAuthCheck(pathname: string): boolean {
  return PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith('/result/')
  );
}

// Check if path needs admin access
function needsAdminCheck(pathname: string): boolean {
  return ADMIN_PATHS.some(
    (path) => pathname === path || pathname.startsWith('/admin/')
  );
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname === '/login';
  const isAdminPath = needsAdminCheck(pathname);
  
  // Skip auth check for non-protected paths (except login redirect check and admin paths)
  if (!needsAuthCheck(pathname) && !isLoginPage && !isAdminPath) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired - only when needed
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes - redirect to login if not authenticated
  if ((needsAuthCheck(pathname) || isAdminPath) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Admin routes - check if user has admin access
  if (isAdminPath && user) {
    const userEmailLower = user.email || '';
    if (!isAdminEmail(userEmailLower)) {
      // Redirect non-admin users to home
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  // Redirect logged-in users away from login page
  if (isLoginPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes - they handle their own auth)
     * - public files
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

