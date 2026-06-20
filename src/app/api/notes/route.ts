/**
 * /api/notes — granular sticky-note operations with fetch-before-write
 * concurrency safety.
 *
 * PATCH /api/notes  — add a comment to a note
 * DELETE /api/notes — delete a whole note (author only) OR a single comment
 *                     (commenter only)
 *
 * All write operations require an authenticated session.
 * GET is handled by /api/storage (returns full AppData).
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { fetchFreshAppData, saveAppData, getDefaultAppData } from "@/lib/github-storage";
import { NoteComment, StickyNote } from "@/types";

export const dynamic = "force-dynamic";

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

    const { noteId, text } = await request.json() as { noteId: string; text: string };

    if (!noteId || !text?.trim()) {
      return NextResponse.json(
        { success: false, error: "noteId and text are required" },
        { status: 400 }
      );
    }

    // ── Fetch-before-write: always get the freshest snapshot ──────────────
    const fresh = await fetchFreshAppData(email);

    const noteIndex = fresh.stickyNotes.findIndex((n: StickyNote) => n.id === noteId);
    if (noteIndex === -1) {
      return NextResponse.json(
        { success: false, error: "Note not found" },
        { status: 404 }
      );
    }

    const newComment: NoteComment = {
      id:        `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text:      text.trim(),
      createdAt: new Date().toISOString(),
      createdBy: { name, email },
    };

    const updatedNote = {
      ...fresh.stickyNotes[noteIndex],
      comments: [...(fresh.stickyNotes[noteIndex].comments ?? []), newComment],
    };

    const updatedNotes = [...fresh.stickyNotes];
    updatedNotes[noteIndex] = updatedNote;

    const newData = { ...fresh, stickyNotes: updatedNotes, updatedAt: new Date().toISOString() };
    const success = await saveAppData(newData, email);

    if (!success) {
      return NextResponse.json(
        { success: false, error: "Failed to persist comment" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, comment: newComment, note: updatedNote });
  } catch (error) {
    console.error("[PATCH /api/notes]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// ── DELETE: remove a whole note or a single comment ───────────────────────
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

    const { noteId, commentId } = await request.json() as {
      noteId: string;
      commentId?: string;
    };

    if (!noteId) {
      return NextResponse.json(
        { success: false, error: "noteId is required" },
        { status: 400 }
      );
    }

    // ── Fetch-before-write ─────────────────────────────────────────────────
    const fresh = await fetchFreshAppData(email);

    const noteIndex = fresh.stickyNotes.findIndex((n) => n.id === noteId);
    if (noteIndex === -1) {
      return NextResponse.json({ success: false, error: "Note not found" }, { status: 404 });
    }

    const note = fresh.stickyNotes[noteIndex];
    let updatedNotes = [...fresh.stickyNotes];

    if (commentId) {
      // ── Delete a single comment (commenter only) ─────────────────────────
      const comment = note.comments?.find((c) => c.id === commentId);
      if (!comment) {
        return NextResponse.json({ success: false, error: "Comment not found" }, { status: 404 });
      }
      if (comment.createdBy.email !== email) {
        return NextResponse.json(
          { success: false, error: "You can only delete your own comments" },
          { status: 403 }
        );
      }
      updatedNotes[noteIndex] = {
        ...note,
        comments: note.comments.filter((c) => c.id !== commentId),
      };
    } else {
      // ── Delete the whole note (original author only) ─────────────────────
      if (note.createdBy && note.createdBy.email !== email) {
        return NextResponse.json(
          { success: false, error: "Only the note author can delete this note" },
          { status: 403 }
        );
      }
      updatedNotes = fresh.stickyNotes.filter((n) => n.id !== noteId);
    }

    const newData = { ...fresh, stickyNotes: updatedNotes, updatedAt: new Date().toISOString() };
    const success = await saveAppData(newData, email);

    if (!success) {
      return NextResponse.json(
        { success: false, error: "Failed to persist deletion" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/notes]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// ── GET: return all notes (public) ─────────────────────────────────────────
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const email   = session?.user?.email ?? null;
    const data    = await fetchFreshAppData(email);
    return NextResponse.json(data.stickyNotes);
  } catch (error) {
    console.error("[GET /api/notes]", error);
    return NextResponse.json(getDefaultAppData().stickyNotes);
  }
}
