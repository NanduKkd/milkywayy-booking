import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const key = new TextEncoder().encode(JWT_SECRET);

export async function middleware(request) {
  const token = request.cookies.get("session-token")?.value;
  let user = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, key);
      user = payload;
    } catch (err) {
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
    if (pathname.startsWith("/dashboard") || pathname === "/") {
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
    if (pathname.startsWith("/dashboard")) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
