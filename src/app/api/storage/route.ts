import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { fetchAppData, saveAppData, getDefaultAppData } from "@/lib/github-storage";
import { AppData } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    // ── 1. Resolve session ─────────────────────────────────────────────────
    let session = null;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("[API CRASH LOG]: getServerSession threw in GET /api/storage:", sessionErr);
    }

    const email = session?.user?.email ?? null;
    console.log(`[GET /api/storage] session=${email ?? "guest"}`);

    // ── 2. Fetch data with its own guard ───────────────────────────────────
    let data: AppData;
    try {
      data = await fetchAppData(email);
    } catch (fetchErr) {
      console.error("[API CRASH LOG]: fetchAppData threw in GET /api/storage:", fetchErr);
      const def = getDefaultAppData();
      return NextResponse.json(
        { ...def, error: String(fetchErr) },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
            "Surrogate-Control": "no-store",
          },
        }
      );
    }

    // ── 3. Validate shape before returning ────────────────────────────────
    const safeData: AppData = {
      bookmarks:    Array.isArray(data.bookmarks)    ? data.bookmarks    : [],
      stickyNotes:  Array.isArray(data.stickyNotes)  ? data.stickyNotes  : [],
      todos:        Array.isArray(data.todos)         ? data.todos        : [],
      invitedUsers: Array.isArray(data.invitedUsers) ? data.invitedUsers : ["chenricky@gmail.com"],
      updatedAt:    data.updatedAt ?? new Date().toISOString(),
    };

    return NextResponse.json(safeData, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        "Surrogate-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[API CRASH LOG]: unhandled exception in GET /api/storage:", error);
    const def = getDefaultAppData();
    return NextResponse.json(
      { bookmarks: def.bookmarks, todos: def.todos, stickyNotes: def.stickyNotes, notes: [], error: String(error) },
      { status: 200 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // ── 1. Resolve session with bulletproof fallbacks ──────────────────────
    let session = null;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("[POST /api/storage] getServerSession threw:", sessionErr);
    }

    const userEmail = session?.user?.email || null;
    const userName  = session?.user?.name
      || (userEmail ? userEmail.split("@")[0] : null)
      || "使用者";

    console.log(`[POST /api/storage] session email=${userEmail ?? "null"} name=${userName}`);

    // Guests cannot write
    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: "Authentication required to save data" },
        { status: 401 }
      );
    }

    // ── 2. Parse request body defensively ─────────────────────────────────
    let body: AppData;
    try {
      body = await request.json();
    } catch (parseErr) {
      console.error("[POST /api/storage] failed to parse request body:", parseErr);
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    // ── 3. Normalise arrays + stamp createdBy on any item missing it ───────
    const createdByField = { name: userName, email: userEmail };

    const data: AppData = {
      bookmarks: Array.isArray(body.bookmarks)
        ? body.bookmarks.map((b) => ({
            ...b,
            createdBy: b.createdBy ?? createdByField,
          }))
        : [],

      stickyNotes: Array.isArray(body.stickyNotes)
        ? body.stickyNotes.map((n) => ({
            ...n,
            comments: Array.isArray(n.comments) ? n.comments : [],
            createdBy: n.createdBy ?? createdByField,
          }))
        : [],

      todos: Array.isArray(body.todos)
        ? body.todos.map((t) => ({
            ...t,
            createdBy: t.createdBy ?? createdByField,
          }))
        : [],

      // Preserve invitedUsers from the stored data — POST should not overwrite it
      invitedUsers: Array.isArray(body.invitedUsers) ? body.invitedUsers : ["chenricky@gmail.com"],

      updatedAt: new Date().toISOString(),
    };

    // ── 4. Persist to GitHub ───────────────────────────────────────────────
    const success = await saveAppData(data, userEmail);

    if (success) {
      return NextResponse.json({ success: true, data });
    }

    console.error("[POST /api/storage] saveAppData returned false — GitHub write failed");
    return NextResponse.json(
      { success: false, error: "Failed to persist data to GitHub" },
      { status: 500 }
    );
  } catch (error) {
    console.error("[POST /api/storage] unhandled exception:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error", detail: String(error) },
      { status: 500 }
    );
  }
}
