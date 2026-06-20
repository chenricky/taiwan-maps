import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { fetchAppData, saveAppData, getDefaultAppData } from "@/lib/github-storage";
import { AppData } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const email   = session?.user?.email ?? null;
    const data    = await fetchAppData(email);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[GET /api/storage]", error);
    return NextResponse.json(getDefaultAppData());
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const email   = session?.user?.email ?? null;

    // Guests cannot write
    if (!email) {
      return NextResponse.json(
        { success: false, error: "Authentication required to save data" },
        { status: 401 }
      );
    }

    const body: AppData = await request.json();

    // Defensive defaults – ensure all required arrays are present
    const data: AppData = {
      bookmarks:   Array.isArray(body.bookmarks)   ? body.bookmarks   : [],
      stickyNotes: Array.isArray(body.stickyNotes) ? body.stickyNotes : [],
      todos:       Array.isArray(body.todos)        ? body.todos        : [],
      updatedAt:   new Date().toISOString(),
    };

    const success = await saveAppData(data, email);

    if (success) {
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json(
      { success: false, error: "Failed to persist data to GitHub" },
      { status: 500 }
    );
  } catch (error) {
    console.error("[POST /api/storage]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
