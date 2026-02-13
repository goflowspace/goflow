import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

export function middleware(request: NextRequest) {
  const edition = process.env.NEXT_PUBLIC_EDITION || 'cloud';

  // В OSS режиме не проверяем авторизацию
  if (edition === 'oss') {
    const pathname = request.nextUrl.pathname;

    // Перенаправляем auth-страницы и cloud-only страницы на /projects
    const cloudOnlyRoutes = ['/auth', '/billing', '/members', '/usage', '/teams'];
    const isCloudOnlyRoute = cloudOnlyRoutes.some((route) => pathname.startsWith(route));

    if (isCloudOnlyRoute) {
      return NextResponse.redirect(new URL('/projects', request.url));
    }

    return NextResponse.next();
  }

  // Cloud: стандартная логика авторизации
  const pathname = request.nextUrl.pathname;

  // Список защищенных маршрутов
  const protectedRoutes = ['/editor', '/play', '/projects'];

  // Проверяем, является ли это защищенным маршрутом
  const isProtectedRoute = protectedRoutes.some((route) => pathname.includes(route));

  // Проверяем наличие токена авторизации
  const token = request.cookies.get('auth_token')?.value;

  // Если это защищенный маршрут и нет токена, перенаправляем на страницу авторизации
  if (isProtectedRoute && !token) {
    const url = new URL('/auth/login', request.url);
    // Сохраняем URL, куда пользователь хотел попасть
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Конфигурация для middleware - указываем, на какие пути он должен срабатывать
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - auth routes
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public|auth).*)'
  ]
};
