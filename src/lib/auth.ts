import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { authConfig } from "./auth.config";
import { db } from "./db";
import { isEmailAllowed, upsertUser, getUserByEmail } from "./actions/users";

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
      // On initial sign-in, populate token with user ID
      if (user?.email) {
        const dbUser = await getUserByEmail(db, user.email);
        if (dbUser) {
          token.id = dbUser.id;
          token.status = dbUser.status;
        }
      }

      // On every request, re-check user status for immediate revocation
      if (token.id) {
        const { getUserById } = await import("./actions/users");
        const dbUser = await getUserById(db, token.id as string);
        if (!dbUser || dbUser.status === "inactive") {
          // Force re-auth by returning empty token
          return {} as typeof token;
        }
        token.status = dbUser.status;
      }

      return token;
    },

    async session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string;
        session.user.status = (token.status as string) ?? "active";
      }
      return session;
    },
  },

  trustHost: true,
});
