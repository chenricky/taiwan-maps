/**
 * /api/invite — admin-only endpoint to manage the invitedUsers whitelist.
 *
 * POST   /api/invite  { email: string }  → add email to whitelist
 * DELETE /api/invite  { email: string }  → remove email from whitelist
 *
 * Only the primary admin (chenricky@gmail.com) may call these endpoints.
 * All other callers receive HTTP 403.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { fetchFreshAppData, saveAppData } from "@/lib/github-storage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ADMIN_EMAIL = "chenricky@gmail.com";

// ── Shared auth guard ──────────────────────────────────────────────────────
async function requireAdmin(): Promise<{ email: string } | NextResponse> {
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch (err) {
    console.error("[api/invite] getServerSession threw:", err);
  }

  const email = session?.user?.email?.toLowerCase() ?? null;
  if (!email || email !== ADMIN_EMAIL) {
    return NextResponse.json(
      { success: false, error: "Forbidden — admin only" },
      { status: 403 }
    );
  }
  return { email };
}

// ── POST: add an email to the whitelist ───────────────────────────────────
export async function POST(request: Request) {
  try {
    const guard = await requireAdmin();
    if (guard instanceof NextResponse) return guard;

    let body: { email?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const newEmail = body.email?.trim().toLowerCase();
    if (!newEmail || !newEmail.includes("@")) {
      return NextResponse.json(
        { success: false, error: "A valid email is required" },
        { status: 400 }
      );
    }

    // Fetch-before-write to avoid race conditions
    const data = await fetchFreshAppData(null);
    const current = (data.invitedUsers ?? [ADMIN_EMAIL]).map((e) => e.toLowerCase());

    if (current.includes(newEmail)) {
      return NextResponse.json({ success: true, message: "Email already in whitelist", invitedUsers: data.invitedUsers });
    }

    const updated = { ...data, invitedUsers: [...data.invitedUsers, newEmail] };
    const ok = await saveAppData(updated, null);

    if (!ok) {
      return NextResponse.json(
        { success: false, error: "Failed to persist whitelist to GitHub" },
        { status: 500 }
      );
    }

    console.log(`[api/invite] POST — added ${newEmail} to whitelist`);
    return NextResponse.json({ success: true, invitedUsers: updated.invitedUsers });
  } catch (error) {
    console.error("[api/invite] POST unhandled error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error", detail: String(error) },
      { status: 500 }
    );
  }
}

// ── DELETE: remove an email from the whitelist ────────────────────────────
export async function DELETE(request: Request) {
  try {
    const guard = await requireAdmin();
    if (guard instanceof NextResponse) return guard;

    let body: { email?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const targetEmail = body.email?.trim().toLowerCase();
    if (!targetEmail) {
      return NextResponse.json({ success: false, error: "email is required" }, { status: 400 });
    }

    // Never allow removing the admin from the list
    if (targetEmail === ADMIN_EMAIL) {
      return NextResponse.json(
        { success: false, error: "Cannot remove the primary admin from the whitelist" },
        { status: 400 }
      );
    }

    const data = await fetchFreshAppData(null);
    const filtered = (data.invitedUsers ?? []).filter(
      (e) => e.toLowerCase() !== targetEmail
    );

    const updated = { ...data, invitedUsers: filtered };
    const ok = await saveAppData(updated, null);

    if (!ok) {
      return NextResponse.json(
        { success: false, error: "Failed to persist whitelist to GitHub" },
        { status: 500 }
      );
    }

    console.log(`[api/invite] DELETE — removed ${targetEmail} from whitelist`);
    return NextResponse.json({ success: true, invitedUsers: updated.invitedUsers });
  } catch (error) {
    console.error("[api/invite] DELETE unhandled error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error", detail: String(error) },
      { status: 500 }
    );
  }
}
