import { NextResponse } from "next/server";
import { fetchAppData, saveAppData, getDefaultAppData } from "@/lib/github-storage";
import { AppData } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await fetchAppData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[GET /api/storage]", error);
    return NextResponse.json(getDefaultAppData());
  }
}

export async function POST(request: Request) {
  try {
    const body: AppData = await request.json();

    // Defensive defaults – ensure all required arrays are present
    const data: AppData = {
      bookmarks:   Array.isArray(body.bookmarks)   ? body.bookmarks   : [],
      stickyNotes: Array.isArray(body.stickyNotes) ? body.stickyNotes : [],
      todos:       Array.isArray(body.todos)        ? body.todos        : [],
      updatedAt:   new Date().toISOString(),
    };

    const success = await saveAppData(data);

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
