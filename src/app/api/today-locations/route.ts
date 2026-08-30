/**
 * /api/today-locations — granular today's-location operations with
 * fetch-before-write concurrency safety. Mirrors /api/notes exactly, just
 * pointed at `todayLocations` instead of `stickyNotes`.
 *
 * PATCH /api/today-locations  — add a comment to a today's location
 * DELETE /api/today-locations — delete a whole location (author only) OR a
 *                                single comment (commenter only)
 *
 * All write operations require an authenticated session.
 * GET is handled by /api/storage (returns full AppData).
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { fetchFreshAppData, saveAppData } from "@/lib/github-storage";
import { NoteComment } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ── PATCH: add a comment ───────────────────────────────────────────────────
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const email   = session?.user?.email ?? null;
    const name    = session?.user?.name  ?? "匿名";

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Authentication required to comment" },
        { status: 401 }
      );
    }

    const { locationId, text } = await request.json() as { locationId: string; text: string };

    if (!locationId || !text?.trim()) {
      return NextResponse.json(
        { success: false, error: "locationId and text are required" },
        { status: 400 }
      );
    }

    // ── Fetch-before-write: always get the freshest snapshot from shared file
    const fresh = await fetchFreshAppData(null);

    const locIndex = fresh.todayLocations.findIndex((l) => l.id === locationId);
    if (locIndex === -1) {
      return NextResponse.json(
        { success: false, error: "Location not found" },
        { status: 404 }
      );
    }

    const newComment: NoteComment = {
      id:        `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text:      text.trim(),
      createdAt: new Date().toISOString(),
      createdBy: { name, email },
    };

    const updatedLoc = {
      ...fresh.todayLocations[locIndex],
      comments: [...(fresh.todayLocations[locIndex].comments ?? []), newComment],
    };

    const updatedLocations = [...fresh.todayLocations];
    updatedLocations[locIndex] = updatedLoc;

    const newData = { ...fresh, todayLocations: updatedLocations, updatedAt: new Date().toISOString() };
    const success = await saveAppData(newData, null);

    if (!success) {
      return NextResponse.json(
        { success: false, error: "Failed to persist comment" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, comment: newComment, location: updatedLoc });
  } catch (error) {
    console.error("[PATCH /api/today-locations]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// ── DELETE: remove a whole location or a single comment ────────────────────
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const email   = session?.user?.email ?? null;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { locationId, commentId } = await request.json() as {
      locationId: string;
      commentId?: string;
    };

    if (!locationId) {
      return NextResponse.json(
        { success: false, error: "locationId is required" },
        { status: 400 }
      );
    }

    // ── Fetch-before-write from shared global file ─────────────────────────
    const fresh = await fetchFreshAppData(null);

    const locIndex = fresh.todayLocations.findIndex((l) => l.id === locationId);
    if (locIndex === -1) {
      return NextResponse.json({ success: false, error: "Location not found" }, { status: 404 });
    }

    const loc = fresh.todayLocations[locIndex];
    let updatedLocations = [...fresh.todayLocations];

    if (commentId) {
      // ── Delete a single comment (commenter only) ─────────────────────────
      const comment = loc.comments?.find((c) => c.id === commentId);
      if (!comment) {
        return NextResponse.json({ success: false, error: "Comment not found" }, { status: 404 });
      }
      if (comment.createdBy.email !== email) {
        return NextResponse.json(
          { success: false, error: "You can only delete your own comments" },
          { status: 403 }
        );
      }
      updatedLocations[locIndex] = {
        ...loc,
        comments: loc.comments.filter((c) => c.id !== commentId),
      };
    } else {
      // ── Delete the whole location (original author only) ─────────────────
      if (loc.createdBy && loc.createdBy.email !== email) {
        return NextResponse.json(
          { success: false, error: "Only the author can delete this location" },
          { status: 403 }
        );
      }
      updatedLocations = fresh.todayLocations.filter((l) => l.id !== locationId);
    }

    const newData = { ...fresh, todayLocations: updatedLocations, updatedAt: new Date().toISOString() };
    const success = await saveAppData(newData, null);

    if (!success) {
      return NextResponse.json(
        { success: false, error: "Failed to persist deletion" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/today-locations]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
