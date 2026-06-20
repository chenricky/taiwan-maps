/**
 * Shared NextAuth configuration — imported by both the route handler
 * and any server-side `getServerSession()` calls.
 *
 * Key fixes for Vercel production:
 * - Explicit JWT + session callbacks so email/name flow through to the client
 * - NEXTAUTH_URL is read automatically by NextAuth from env; we log a warning
 *   if it is missing so Vercel logs surface the misconfiguration immediately.
 * - `trustHost: true` allows NextAuth to accept the Vercel-assigned hostname
 *   without requiring an exact NEXTAUTH_URL match (needed for preview deploys).
 */
import type { NextAuthOptions, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import { fetchFreshAppData } from "@/lib/github-storage";

if (!process.env.NEXTAUTH_SECRET) {
  console.error("[auth-options] ⚠️  NEXTAUTH_SECRET is not set — sessions will not work!");
}
if (!process.env.NEXTAUTH_URL && process.env.NODE_ENV === "production") {
  console.warn(
    "[auth-options] ⚠️  NEXTAUTH_URL is not set. " +
    "Set it to your Vercel deployment URL (e.g. https://your-app.vercel.app) " +
    "in Vercel → Settings → Environment Variables."
  );
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID     ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],

  session: { strategy: "jwt" },

  secret: process.env.NEXTAUTH_SECRET,

  /**
   * trustHost lets NextAuth accept any host header Vercel sends,
   * so preview-deploy URLs work without updating NEXTAUTH_URL each time.
   */
  // @ts-expect-error — `trustHost` is valid in next-auth v4.22+ but not yet in all type defs
  trustHost: true,

  callbacks: {
    /**
     * Whitelist gatekeeper — only allow sign-in if the email is the primary
     * admin or is present in the `invitedUsers` array stored in GitHub.
     */
    async signIn({ user }: { user: { email?: string | null } }) {
      if (!user.email) return false;

      const loginEmail = user.email.toLowerCase();

      // 1. Always allow the primary admin
      if (loginEmail === "chenricky@gmail.com") return true;

      // 2. Fetch fresh data from GitHub to check the whitelist
      try {
        const data = await fetchFreshAppData(null); // reads the shared user_data.json
        const whitelist = (data.invitedUsers ?? []).map((e: string) => e.toLowerCase());
        if (whitelist.includes(loginEmail)) return true;
      } catch (err) {
        console.error("[auth-options] Whitelist check failed:", err);
      }

      // 3. Reject — redirect to a friendly error page
      return "/auth/access-denied";
    },

    /**
     * Persist email + name into the JWT token on sign-in.
     * Without this, token.email is undefined and the session is empty.
     */
    async jwt({ token, user }: { token: JWT; user?: { email?: string | null; name?: string | null } }) {
      if (user) {
        token.email = user.email ?? token.email;
        token.name  = user.name  ?? token.name;
      }
      return token;
    },

    /**
     * Expose email + name on the client-side session object.
     * Without this, useSession() returns session.user = {} on the client.
     */
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        session.user.email = (token.email as string) ?? session.user.email;
        session.user.name  = (token.name  as string) ?? session.user.name;
      }
      return session;
    },
  },
};
