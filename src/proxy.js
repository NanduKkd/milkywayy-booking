import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import { sessionConfig } from "@/lib/config/session";
import {
  buildDashboardAccessHref,
  isDashboardPath,
  isDashboardRootPath,
} from "@/lib/helpers/dashboardAuth";

export async function proxy(request) {
  const token = request.cookies.get(sessionConfig.cookieName)?.value;
  let user = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, sessionConfig.key);
      user = payload;
    } catch (_err) {
      // Invalid token
    }
  }

  const { pathname } = request.nextUrl;

  // Define roles
  const isCustomer = user?.role === "CUSTOMER";
  const isAdmin = user && user.role !== "CUSTOMER"; // Assuming any non-customer is admin/staff

  // Admin Logic
  if (isAdmin) {
    // Redirect /dashboard and / to /admin
    if (isDashboardPath(pathname) || pathname === "/") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    // Allow /admin and other routes (like /booking if needed)
    return NextResponse.next();
  }

  // Customer Logic
  if (isCustomer) {
    // Redirect /admin to /dashboard
    if (pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    // Allow /dashboard, /booking, /
    return NextResponse.next();
  }

  // Anonymous Logic
  if (!user) {
    // Protect /admin routes
    if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    // Protect /dashboard routes
    if (isDashboardPath(pathname) && !isDashboardRootPath(pathname)) {
      const redirectHref = buildDashboardAccessHref(
        `${pathname}${request.nextUrl.search}`,
      );
      return NextResponse.redirect(new URL(redirectHref, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
