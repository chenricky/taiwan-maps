import { NextResponse } from "next/server";
import { fetchAppData, saveAppData, getDefaultAppData } from "@/lib/github-storage";
import { AppData } from "@/types";

export async function GET() {
  try {
    const data = await fetchAppData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/storage error:", error);
    return NextResponse.json(getDefaultAppData());
  }
}

export async function POST(request: Request) {
  try {
    const data: AppData = await request.json();
    const success = await saveAppData(data);
    if (success) {
      return NextResponse.json({ success: true, data });
    } else {
      return NextResponse.json(
        { success: false, error: "Failed to save data" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("POST /api/storage error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}