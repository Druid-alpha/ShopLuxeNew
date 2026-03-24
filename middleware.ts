import { NextResponse, type NextRequest } from "next/server";

const protectedPaths = ["/profile", "/orders", "/checkout", "/admin"];
const adminPaths = ["/admin"];
const authPages = ["/login", "/register"];

const isProtectedPath = (pathname: string) =>
  protectedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
const isAdminPath = (pathname: string) =>
  adminPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
const isAuthPage = (pathname: string) =>
  authPages.some((path) => pathname === path || pathname.startsWith(`${path}/`));

const decodeJwtPayload = (token: string) => {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
};

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const accessToken = request.cookies.get("accessToken")?.value;

  if (isAuthPage(pathname) && accessToken) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/profile";
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  if (accessToken) {
    if (isAdminPath(pathname)) {
      const payload = decodeJwtPayload(accessToken);
      const role = String(payload?.role || "").toLowerCase();
      const exp = Number(payload?.exp || 0);
      const isExpired = exp ? Date.now() / 1000 >= exp : false;

      if (isExpired) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = "/login";
        loginUrl.search = `?returnTo=${encodeURIComponent(`${pathname}${search}`)}&reason=admin`;
        return NextResponse.redirect(loginUrl);
      }

      // If role is present and not admin, redirect. If role is missing, let client
      // ProtectedRoute handle it to avoid false negatives.
      if (role && role !== "admin") {
        const homeUrl = request.nextUrl.clone();
        homeUrl.pathname = "/profile";
        homeUrl.search = "";
        return NextResponse.redirect(homeUrl);
      }
    }

    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = `?returnTo=${encodeURIComponent(`${pathname}${search}`)}`;
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/profile/:path*",
    "/orders/:path*",
    "/checkout/:path*",
    "/admin/:path*",
    "/login",
    "/register",
  ],
};
