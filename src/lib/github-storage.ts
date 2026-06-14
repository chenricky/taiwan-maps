/**
 * GitHub Contents API storage backend.
 *
 * Flat on-disk schema (data/user_data.json in the repo):
 *   { "bookmarks": [], "notes": [], "todos": [] }
 *
 * The in-memory AppData type uses `stickyNotes` for notes; we translate
 * on read and write so the rest of the app is unchanged.
 */

import { AppData, Bookmark, StickyNote, TodoItem } from "@/types";

const GITHUB_TOKEN  = process.env.GITHUB_TOKEN  || "";
const REPO_OWNER    = process.env.GITHUB_USERNAME || process.env.REPO_OWNER || "";
const REPO_NAME     = process.env.GITHUB_REPO    || process.env.REPO_NAME  || "";
const FILE_PATH     = "data/user_data.json";
const BRANCH        = "main";

const GITHUB_API = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;

// ── Flat on-disk schema ────────────────────────────────────────────────────
interface FlatStorageSchema {
  bookmarks: Bookmark[];
  notes:     StickyNote[];
  todos:     TodoItem[];
}

function toFlat(data: AppData): FlatStorageSchema {
  return {
    bookmarks: data.bookmarks  ?? [],
    notes:     data.stickyNotes ?? [],
    todos:     data.todos       ?? [],
  };
}

function fromFlat(flat: FlatStorageSchema): AppData {
  return {
    bookmarks:   flat.bookmarks ?? [],
    stickyNotes: flat.notes     ?? [],
    todos:       flat.todos     ?? [],
    updatedAt:   new Date().toISOString(),
  };
}

// ── In-process cache ───────────────────────────────────────────────────────
let cachedData: AppData | null = null;
let cachedSha:  string | null  = null;

export function getDefaultAppData(): AppData {
  return {
    bookmarks:   [],
    stickyNotes: [],
    todos:       [],
    updatedAt:   new Date().toISOString(),
  };
}

// ── Fetch ──────────────────────────────────────────────────────────────────
export async function fetchAppData(): Promise<AppData> {
  if (cachedData) return cachedData;

  if (!GITHUB_TOKEN || !REPO_OWNER || !REPO_NAME) {
    console.warn("[github-storage] credentials not configured – using in-memory defaults");
    cachedData = getDefaultAppData();
    return cachedData;
  }

  try {
    const res = await fetch(GITHUB_API, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
      cache: "no-store",
    });

    if (res.status === 404) {
      // File doesn't exist yet – return defaults (will be created on first save)
      cachedData = getDefaultAppData();
      return cachedData;
    }

    if (!res.ok) {
      throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
    }

    const fileData = await res.json();
    cachedSha = fileData.sha;

    const raw  = Buffer.from(fileData.content, "base64").toString("utf-8");
    const flat = JSON.parse(raw) as FlatStorageSchema;

    // Tolerate files that were saved with the old schema (had stickyNotes key)
    const normalised: FlatStorageSchema = {
      bookmarks: flat.bookmarks ?? (flat as any).bookmarks ?? [],
      notes:     flat.notes     ?? (flat as any).stickyNotes ?? [],
      todos:     flat.todos     ?? [],
    };

    cachedData = fromFlat(normalised);
    return cachedData;
  } catch (error) {
    console.error("[github-storage] fetchAppData failed:", error);
    cachedData = getDefaultAppData();
    return cachedData;
  }
}

// ── Save ───────────────────────────────────────────────────────────────────
export async function saveAppData(data: AppData): Promise<boolean> {
  if (!GITHUB_TOKEN || !REPO_OWNER || !REPO_NAME) {
    console.warn("[github-storage] credentials not configured – in-memory save only");
    cachedData = data;
    return true;
  }

  // Update cache immediately so subsequent reads are consistent
  cachedData = { ...data, updatedAt: new Date().toISOString() };

  // Serialise using the flat schema
  const flat    = toFlat(cachedData);
  const content = Buffer.from(JSON.stringify(flat, null, 2)).toString("base64");

  try {
    // Refresh SHA if we don't have it
    if (!cachedSha) {
      const headRes = await fetch(GITHUB_API, {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
        cache: "no-store",
      });
      if (headRes.ok) {
        const headData = await headRes.json();
        cachedSha = headData.sha;
      }
    }

    const body: Record<string, unknown> = {
      message: "chore: update taiwan-maps user data",
      content,
      branch: BRANCH,
    };
    if (cachedSha) body.sha = cachedSha;

    const putRes = await fetch(GITHUB_API, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!putRes.ok) {
      const errText = await putRes.text();
      throw new Error(`GitHub PUT error: ${putRes.status} – ${errText}`);
    }

    const result = await putRes.json();
    cachedSha = result.content?.sha ?? null;
    return true;
  } catch (error) {
    console.error("[github-storage] saveAppData failed:", error);
    return false;
  }
}

// ── Cache helpers ──────────────────────────────────────────────────────────
export function clearCache(): void {
  cachedData = null;
  cachedSha  = null;
}
