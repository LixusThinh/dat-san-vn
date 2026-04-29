// apps/web/src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { PROTECTED_ROUTES, PROXY_ROUTES } from './middleware/routes';

const isProtectedRoute = createRouteMatcher([...PROTECTED_ROUTES]);
const isProxyRoute = createRouteMatcher([...PROXY_ROUTES]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, redirectToSignIn, getToken } = await auth();

  // 1. Bảo vệ route frontend
  if (isProtectedRoute(req) && !userId) {
    return redirectToSignIn({ returnBackUrl: req.url });
  }

  // 2. Proxy API sang NestJS backend
  if (isProxyRoute(req)) {
    const url = new URL(req.url);
    const backendUrl = new URL(url.pathname + url.search, process.env.NEXT_PUBLIC_API_URL!);

    const token = await getToken();

    const response = await fetch(backendUrl.toString(), {
      method: req.method,
      headers: {
        ...Object.fromEntries(req.headers),
        Authorization: token ? `Bearer ${token}` : '',
      },
      body: req.body ? await req.arrayBuffer() : undefined, // hỗ trợ stream + file upload
    });

    return response;
  }
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)).*)',
  ],
};
