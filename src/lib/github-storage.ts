/**
 * GitHub Contents API storage backend — multi-user edition.
 *
 * Each logged-in user gets their own file in the repo:
 *   data/user_data_<sanitised_email>.json
 *
 * Guests (no session) fall back to the global default (read-only).
 *
 * Flat on-disk schema:
 *   { "bookmarks": [], "notes": [], "todos": [] }
 *
 * The in-memory AppData type uses `stickyNotes` for notes; we translate
 * on read and write so the rest of the app is unchanged.
 */

import { AppData, Bookmark, StickyNote, TodoItem } from "@/types";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN  || "";
const REPO_OWNER   = process.env.GITHUB_USERNAME || process.env.REPO_OWNER || "";
const REPO_NAME    = process.env.GITHUB_REPO    || process.env.REPO_NAME  || "";
const BRANCH       = "main";

// ── Email → safe filename ──────────────────────────────────────────────────
/**
 * Converts an email address into a safe filename segment.
 * e.g. "ricky@gmail.com" → "ricky_at_gmail_com"
 */
export function emailToFilename(email: string): string {
  return email
    .toLowerCase()
    .replace(/@/g, "_at_")
    .replace(/\./g, "_")
    .replace(/[^a-z0-9_]/g, "_");
}

export function getFilePath(email?: string | null): string {
  if (email) {
    return `data/user_data_${emailToFilename(email)}.json`;
  }
  return "data/user_data.json";
}

function githubApiUrl(filePath: string): string {
  return `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`;
}

// ── Flat on-disk schema ────────────────────────────────────────────────────
interface FlatStorageSchema {
  bookmarks: Bookmark[];
  notes:     StickyNote[];
  todos:     TodoItem[];
}

function toFlat(data: AppData): FlatStorageSchema {
  return {
    bookmarks: data.bookmarks   ?? [],
    notes:     data.stickyNotes ?? [],
    todos:     data.todos       ?? [],
  };
}

function fromFlat(flat: FlatStorageSchema): AppData {
  return {
    bookmarks: (flat.bookmarks ?? []).map((b) => ({
      id:        b.id        ?? `bm-legacy-${Math.random().toString(36).slice(2)}`,
      lat:       b.lat       ?? 0,
      lng:       b.lng       ?? 0,
      label:     b.label     ?? "未命名書籤",
      createdAt: b.createdAt ?? new Date().toISOString(),
    })),

    // Ensure every note has `comments` and `createdBy` (backwards-compat with v1 notes)
    stickyNotes: (flat.notes ?? []).map((n) => ({
      id:        n.id        ?? `note-legacy-${Math.random().toString(36).slice(2)}`,
      lat:       n.lat       ?? 0,
      lng:       n.lng       ?? 0,
      content:   n.content   ?? (n as unknown as Record<string, string>)["text"] ?? "",
      color:     n.color     ?? "#fef68a",
      createdAt: n.createdAt ?? new Date().toISOString(),
      createdBy: n.createdBy ?? undefined,
      comments:  Array.isArray(n.comments)
        ? n.comments.map((c) => ({
            id:        c.id        ?? `cmt-legacy-${Math.random().toString(36).slice(2)}`,
            text:      c.text      ?? "",
            createdAt: c.createdAt ?? new Date().toISOString(),
            createdBy: c.createdBy ?? { name: "匿名", email: "unknown" },
          }))
        : [],
    })),

    todos: (flat.todos ?? []).map((t) => ({
      id:                  t.id        ?? `todo-legacy-${Math.random().toString(36).slice(2)}`,
      text:                t.text      ?? "",
      completed:           t.completed ?? false,
      reminderDate:        t.reminderDate        ?? null,
      reminderBookmarkId:  t.reminderBookmarkId  ?? null,
      createdAt:           t.createdAt ?? new Date().toISOString(),
    })),

    updatedAt: new Date().toISOString(),
  };
}

// ── Per-user in-process cache ──────────────────────────────────────────────
// Key: filePath (includes the user-specific segment)
const dataCache = new Map<string, AppData>();
const shaCache  = new Map<string, string>();

export function getDefaultAppData(): AppData {
  return {
    bookmarks:   [],
    stickyNotes: [],
    todos:       [],
    updatedAt:   new Date().toISOString(),
  };
}

// ── Fetch ──────────────────────────────────────────────────────────────────
export async function fetchAppData(email?: string | null): Promise<AppData> {
  const filePath = getFilePath(email);

  const cached = dataCache.get(filePath);
  if (cached) return cached;

  if (!GITHUB_TOKEN || !REPO_OWNER || !REPO_NAME) {
    console.warn("[github-storage] credentials not configured – using in-memory defaults");
    const def = getDefaultAppData();
    dataCache.set(filePath, def);
    return def;
  }

  try {
    const res = await fetch(githubApiUrl(filePath), {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
      cache: "no-store",
    });

    if (res.status === 404) {
      // File doesn't exist yet – return defaults (will be created on first save)
      const def = getDefaultAppData();
      dataCache.set(filePath, def);
      return def;
    }

    if (!res.ok) {
      throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
    }

    const fileData = await res.json();
    shaCache.set(filePath, fileData.sha);

    const raw  = Buffer.from(fileData.content, "base64").toString("utf-8");
    const flat = JSON.parse(raw) as FlatStorageSchema;

    // Tolerate files saved with the old schema (had stickyNotes key)
    const flatAny = (flat as unknown) as Record<string, unknown>;
    const normalised: FlatStorageSchema = {
      bookmarks: flat.bookmarks ?? (flatAny["bookmarks"] as Bookmark[])    ?? [],
      notes:     flat.notes     ?? (flatAny["stickyNotes"] as StickyNote[]) ?? [],
      todos:     flat.todos     ?? [],
    };

    const appData = fromFlat(normalised);
    dataCache.set(filePath, appData);
    return appData;
  } catch (error) {
    console.error("[github-storage] fetchAppData failed:", error);
    const def = getDefaultAppData();
    dataCache.set(filePath, def);
    return def;
  }
}

// ── Save ───────────────────────────────────────────────────────────────────
export async function saveAppData(data: AppData, email?: string | null): Promise<boolean> {
  const filePath = getFilePath(email);

  if (!GITHUB_TOKEN || !REPO_OWNER || !REPO_NAME) {
    console.warn("[github-storage] credentials not configured – in-memory save only");
    dataCache.set(filePath, data);
    return true;
  }

  // Update cache immediately so subsequent reads are consistent
  const updated = { ...data, updatedAt: new Date().toISOString() };
  dataCache.set(filePath, updated);

  // Serialise using the flat schema
  const flat    = toFlat(updated);
  const content = Buffer.from(JSON.stringify(flat, null, 2)).toString("base64");
  const apiUrl  = githubApiUrl(filePath);

  try {
    // Refresh SHA if we don't have it
    if (!shaCache.has(filePath)) {
      const headRes = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
        cache: "no-store",
      });
      if (headRes.ok) {
        const headData = await headRes.json();
        shaCache.set(filePath, headData.sha);
      }
    }

    const body: Record<string, unknown> = {
      message: `chore: update user data${email ? ` for ${emailToFilename(email)}` : ""}`,
      content,
      branch: BRANCH,
    };
    const sha = shaCache.get(filePath);
    if (sha) body.sha = sha;

    const putRes = await fetch(apiUrl, {
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
    const newSha = result.content?.sha;
    if (newSha) shaCache.set(filePath, newSha);
    return true;
  } catch (error) {
    console.error("[github-storage] saveAppData failed:", error);
    return false;
  }
}

// ── Cache helpers ──────────────────────────────────────────────────────────
export function clearCache(email?: string | null): void {
  const filePath = getFilePath(email);
  dataCache.delete(filePath);
  shaCache.delete(filePath);
}

export function clearAllCaches(): void {
  dataCache.clear();
  shaCache.clear();
}

/**
 * Always fetches a fresh copy from GitHub (bypasses in-process cache).
 * Use this before any write operation to prevent race conditions.
 */
export async function fetchFreshAppData(email?: string | null): Promise<AppData> {
  clearCache(email);
  return fetchAppData(email);
}
