import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      // Public routes
      if (pathname === "/login" || pathname.startsWith("/api/auth")) {
        return true;
      }

      // All other routes require authentication
      return isLoggedIn;
    },
  },
  providers: [], // Providers added in full auth config (avoid proxy runtime issues)
} satisfies NextAuthConfig;
