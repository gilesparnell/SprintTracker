import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { db } from "./db";
import { isEmailAllowed, upsertUser, getUserByEmail } from "./actions/users";
import { unstable_cache } from "next/cache";

// Cache user status for 60s — avoids a DB query on every single request
const getCachedUserStatus = unstable_cache(
  async (userId: string) => {
    const { getUserById } = await import("./actions/users");
    const user = await getUserById(db, userId);
    return user
      ? { exists: true, status: user.status, role: user.role }
      : { exists: false, status: null, role: null };
  },
  ["user-auth-status"],
  { revalidate: 60 }
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
    // Dev-only credentials provider for automated testing
    ...(process.env.NODE_ENV === "development"
      ? [
          Credentials({
            id: "dev-login",
            name: "Dev Login",
            credentials: {
              email: { label: "Email", type: "email" },
            },
            async authorize(credentials) {
              const email = credentials?.email as string;
              if (!email) return null;
              const allowed = await isEmailAllowed(db, email);
              if (!allowed) return null;
              await upsertUser(db, { email, name: email.split("@")[0] });
              const user = await getUserByEmail(db, email);
              if (!user) return null;
              return { id: user.id, email: user.email, name: user.name };
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    ...authConfig.callbacks,

    async signIn({ user }) {
      if (!user.email) {
        return "/login?error=AccessDenied";
      }

      try {
        const allowed = await isEmailAllowed(db, user.email);
        if (!allowed) {
          return "/login?error=AccessDenied";
        }

        // Upsert user record (create on first login, update lastLoginAt on return)
        await upsertUser(db, {
          email: user.email,
          name: user.name,
          image: user.image,
        });
      } catch (error) {
        console.error("[auth] Sign-in error:", error);
        return "/login?error=AccessDenied";
      }

      return true;
    },

    async jwt({ token, user }) {
      // On initial sign-in, populate token with user ID + role
      if (user?.email) {
        const dbUser = await getUserByEmail(db, user.email);
        if (dbUser) {
          token.id = dbUser.id;
          token.status = dbUser.status;
          token.role = dbUser.role;
        }
      }

      // Re-check user status (cached 60s) for revocation
      if (token.id) {
        const cached = await getCachedUserStatus(token.id as string);
        if (!cached.exists || cached.status === "inactive") {
          return {} as typeof token;
        }
        token.status = cached.status;
        token.role = cached.role;
      }

      return token;
    },

    async session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string;
        session.user.status = (token.status as string) ?? "active";
        session.user.role = (token.role as string) ?? "user";
      }
      return session;
    },
  },

  trustHost: true,
});
