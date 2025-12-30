import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

// Имя cookie для кэширования сессии
const SESSION_CHECK_COOKIE = 'session_checked';
const USER_ROLE_COOKIE = 'user_role';
const ROLE_CACHE_TTL = 5 * 60 * 1000; // 5 минут
const SESSION_CHECK_TTL = 60 * 1000; // 1 минута - для быстрой проверки сессии

/**
 * Быстрая проверка наличия сессии по cookie
 * Избегаем полного getUser() если сессия недавно проверялась
 */
function hasRecentSessionCheck(request: NextRequest): boolean {
  const sessionCheck = request.cookies.get(SESSION_CHECK_COOKIE)?.value;
  if (!sessionCheck) return false;
  
  const timestamp = parseInt(sessionCheck);
  return Date.now() - timestamp < SESSION_CHECK_TTL;
}

/**
 * Получить роль пользователя с кэшированием в cookie
 * Снижает количество DB запросов на каждый переход в admin
 */
async function getUserRole(
  email: string | null | undefined,
  request: NextRequest,
  response: NextResponse
): Promise<string> {
  if (!email) return 'user';
  
  // Проверяем кэш в cookie
  const cachedRole = request.cookies.get(USER_ROLE_COOKIE)?.value;
  if (cachedRole) {
    // Парсим кэш: role:email:timestamp
    const [role, cachedEmail, timestamp] = cachedRole.split(':');
    const age = Date.now() - parseInt(timestamp || '0');
    
    // Если email совпадает и кэш свежий - возвращаем из кэша
    if (cachedEmail === email && age < ROLE_CACHE_TTL) {
      return role || 'user';
    }
  }
  
  // Запрашиваем из БД
  try {
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
    
    const role = data?.role || 'user';
    
    // Кэшируем в cookie
    const cacheValue = `${role}:${email}:${Date.now()}`;
    response.cookies.set(USER_ROLE_COOKIE, cacheValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60, // 1 час максимум
      path: '/',
    });
    
    return role;
  } catch (error) {
    console.error('[Middleware] Error fetching user role:', error);
    return 'user';
  }
}

function isAdminRole(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'super_admin';
}

// Protected routes that require auth check
// Note: '/' is NOT protected - it shows landing page for unauthenticated users
const PROTECTED_PATHS = ['/history', '/result', '/video', '/analyze', '/brainstorm', '/inpaint', '/expand', '/keyframes', '/profile', '/workspaces'];

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

  // ОПТИМИЗАЦИЯ: Проверяем наличие auth cookies без полного getUser()
  // Если есть sb-access-token cookie - сессия скорее всего валидна
  const hasAuthCookie = request.cookies.has('sb-access-token') || 
                        request.cookies.getAll().some(c => c.name.includes('auth-token'));
  
  // Для не-admin путей можно пропустить полную проверку если есть cookie
  // и недавно была успешная проверка
  if (!isAdminPath && !isLoginPage && hasAuthCookie && hasRecentSessionCheck(request)) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // ВАЖНО: Отключаем автоматический refresh токена в middleware
        // чтобы избежать запросов к заблокированному Supabase
        // Refresh будет происходить на клиенте через прокси
        autoRefreshToken: false,
        persistSession: true,
        detectSessionInUrl: false,
      },
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
  // Add timeout to prevent 504 errors when Supabase is slow
  let user = null;
  let authFailed = false;
  
  try {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Auth timeout')), 2000) // 2 sec timeout
    );
    const authPromise = supabase.auth.getUser();
    const result = await Promise.race([authPromise, timeoutPromise]) as { data: { user: any } };
    user = result.data?.user;
    
    // Помечаем успешную проверку сессии
    if (user) {
      supabaseResponse.cookies.set(SESSION_CHECK_COOKIE, Date.now().toString(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60, // 1 минута
        path: '/',
      });
    }
  } catch (error) {
    console.error('[Middleware] Auth check failed or timed out:', error);
    authFailed = true;
    
    // FALLBACK: If we have auth cookies, assume user is logged in
    // API routes will do proper auth check
    if (hasAuthCookie) {
      // Allow request to proceed - API routes handle their own auth
      return NextResponse.next({ request });
    }
    
    // No cookies and auth failed - redirect to login for protected routes
    if (needsAuthCheck(pathname) || isAdminPath) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }

  // Protected routes - redirect to login if not authenticated
  if ((needsAuthCheck(pathname) || isAdminPath) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Admin routes - check if user has admin access (role from DB with caching)
  if (isAdminPath && user) {
    const userRole = await getUserRole(user.email, request, supabaseResponse);
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

  // NOTE: Workspace check is done in page.tsx, not middleware
  // to avoid extra DB queries on every request

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

