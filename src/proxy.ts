import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const session = await auth();
  const { pathname } = request.nextUrl;

  // Already on login page — don't redirect loop
  if (pathname === "/login") {
    if (session?.user) {
      return NextResponse.redirect(new URL("/sprints", request.url));
    }
    return NextResponse.next();
  }

  // Unauthenticated → redirect to login
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - /api/auth (NextAuth routes)
     * - /_next/static (static files)
     * - /_next/image (image optimisation)
     * - /favicon.ico
     */
    "/((?!api/auth|_next/static|_next/image|favicon\\.ico).*)",
  ],
};
