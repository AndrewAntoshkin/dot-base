import { createServerClient, createClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Получить роль пользователя из БД
 * Используем service role client для middleware
 */
async function getUserRoleFromDb(email: string | null | undefined): Promise<string> {
  if (!email) return 'user';
  
  try {
    // Создаём отдельный клиент для middleware (без cookies)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
    
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('email', email.toLowerCase())
      .single() as { data: { role: string } | null };
    
    return data?.role || 'user';
  } catch (error) {
    console.error('[Middleware] Error fetching user role:', error);
    return 'user';
  }
}

function isAdminRole(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'super_admin';
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

  // Admin routes - check if user has admin access (role from DB)
  if (isAdminPath && user) {
    const userRole = await getUserRoleFromDb(user.email);
    if (!isAdminRole(userRole)) {
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

