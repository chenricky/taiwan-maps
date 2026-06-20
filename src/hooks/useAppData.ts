"use client";

import useSWR from "swr";
import { useCallback } from "react";
import { AppData } from "@/types";

const STORAGE_URL = "/api/storage";

const EMPTY: AppData = {
  bookmarks:    [],
  stickyNotes:  [],
  todos:        [],
  invitedUsers: [],
  updatedAt:    "",
};

async function fetcher([url]: [string, string | null]): Promise<AppData> {
  const res = await fetch(`${url}?t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`[useAppData] HTTP ${res.status}`);

  const raw = (await res.json()) as Record<string, unknown>;

  if (raw.error) {
    console.warn("[useAppData] /api/storage returned error field:", raw.error);
  }
  if (!Array.isArray(raw.bookmarks) || !Array.isArray(raw.stickyNotes) || !Array.isArray(raw.todos)) {
    console.warn("[useAppData] /api/storage response had unexpected shape:", raw);
  }

  return {
    bookmarks:    Array.isArray(raw.bookmarks)    ? (raw.bookmarks    as AppData["bookmarks"])    : [],
    stickyNotes:  Array.isArray(raw.stickyNotes)  ? (raw.stickyNotes  as AppData["stickyNotes"])  : [],
    todos:        Array.isArray(raw.todos)         ? (raw.todos        as AppData["todos"])        : [],
    invitedUsers: Array.isArray(raw.invitedUsers) ? (raw.invitedUsers as AppData["invitedUsers"]) : [],
    updatedAt:    typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
  };
}

// Only triggers a React re-render when the stored timestamp changes.
// Equal updatedAt → same data → no re-render → no map flicker on idle polls.
function isSameData(a: AppData | undefined, b: AppData | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.updatedAt !== "" && a.updatedAt === b.updatedAt;
}

/**
 * Drop-in data layer for page.tsx.
 *
 * sessionReady: pass `sessionStatus !== "loading"` — the hook stays dormant
 * until the NextAuth session has resolved (matching the previous useEffect guard).
 *
 * userEmail: included in the SWR cache key so login/logout immediately
 * re-fetches instead of waiting up to 5 s for the next poll tick.
 */
export function useAppData(sessionReady: boolean, userEmail: string | null) {
  const swrKey: [string, string | null] | null = sessionReady
    ? [STORAGE_URL, userEmail]
    : null;

  const { data, mutate, isLoading } = useSWR<AppData>(
    swrKey,
    fetcher,
    {
      refreshInterval:    5_000,
      revalidateOnFocus:  true,
      refreshWhenHidden:  false,
      dedupingInterval:   2_000,
      keepPreviousData:   true,
      compare:            isSameData,
    }
  );

  const saveData = useCallback(
    async (newData: AppData) => {
      // Show the change immediately without a loading flash (optimistic update).
      // Pass the old updatedAt so isSameData suppresses any concurrent idle
      // poll that returns the pre-save GitHub file (same timestamp → no flicker).
      await mutate(newData, { revalidate: false });

      try {
        await fetch(STORAGE_URL, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(newData),
        });
        // Revalidate so SWR cache holds the server-stamped updatedAt,
        // keeping future isSameData comparisons accurate.
        mutate();
      } catch (err) {
        console.error("[useAppData] saveData failed:", err);
        mutate(); // roll back to the last good server state
      }
    },
    [mutate]
  );

  return {
    appData:     data ?? EMPTY,
    isLoading,
    saveData,
    refreshData: mutate,
  };
}
