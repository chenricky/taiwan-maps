"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

/**
 * Wraps the app in NextAuth's SessionProvider.
 *
 * refetchOnWindowFocus: true  — re-validates the JWT when the user switches
 *   back to the tab (catches Vercel cold-start stale sessions).
 * refetchInterval: 5 * 60    — silently refreshes the session every 5 min
 *   so long-lived sessions don't expire mid-session.
 */
export default function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider
      refetchOnWindowFocus
      refetchInterval={5 * 60}
    >
      {children}
    </SessionProvider>
  );
}
