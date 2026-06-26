import NextAuth from 'next-auth';
import authConfig from './auth.config';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const isApiRoute = nextUrl.pathname.startsWith('/api');
  const isAuthRoute = nextUrl.pathname.startsWith('/login');
  const isSetupRoute = nextUrl.pathname.startsWith('/setup');

  if (isApiRoute) {
    return;
  }

  if (isAuthRoute) {
    if (isLoggedIn) {
      return Response.redirect(new URL('/', nextUrl));
    }
    return;
  }

  if (isSetupRoute) {
    if (!isLoggedIn) {
      return Response.redirect(new URL('/login', nextUrl));
    }
    if ((req.auth?.user as any)?.coupleId) {
      return Response.redirect(new URL('/', nextUrl));
    }
    return;
  }
  
  const isRegisterRoute = nextUrl.pathname.startsWith('/register');
  if (isRegisterRoute) {
    if (isLoggedIn) {
      return Response.redirect(new URL('/', nextUrl));
    }
    return;
  }

  if (!isLoggedIn) {
    return Response.redirect(new URL('/login', nextUrl));
  }

  if (!(req.auth?.user as any)?.coupleId) {
    return Response.redirect(new URL('/setup', nextUrl));
  }

  return;
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
