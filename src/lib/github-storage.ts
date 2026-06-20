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
const BRANCH       = process.env.GITHUB_BRANCH || "master";

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
  bookmarks:    Bookmark[];
  notes:        StickyNote[];
  todos:        TodoItem[];
  invitedUsers: string[];
}

const ADMIN_EMAIL = "chenricky@gmail.com";

function toFlat(data: AppData): FlatStorageSchema {
  return {
    bookmarks:    data.bookmarks    ?? [],
    notes:        data.stickyNotes  ?? [],
    todos:        data.todos        ?? [],
    invitedUsers: data.invitedUsers ?? [ADMIN_EMAIL],
  };
}

function fromFlat(flat: FlatStorageSchema): AppData {
  // ── Bookmarks ────────────────────────────────────────────────────────────
  const bookmarks = (Array.isArray(flat.bookmarks) ? flat.bookmarks : []).map((b) => {
    try {
      // Defensive createdBy: always a valid object or undefined
      const rawCB = (b as unknown as Record<string, unknown>)["createdBy"];
      const cbObj = rawCB && typeof rawCB === "object" ? rawCB as Record<string, unknown> : null;
      const safeCreatedBy = cbObj
        ? { name: String(cbObj["name"] || "系統管理員"), email: String(cbObj["email"] || "system") }
        : undefined;

      return {
        id:        typeof b.id === "string" && b.id        ? b.id        : `bm-legacy-${Math.random().toString(36).slice(2)}`,
        lat:       typeof b.lat === "number"               ? b.lat       : 0,
        lng:       typeof b.lng === "number"               ? b.lng       : 0,
        label:     typeof b.label === "string" && b.label  ? b.label     : "未命名書籤",
        createdAt: typeof b.createdAt === "string"         ? b.createdAt : new Date().toISOString(),
        ...(safeCreatedBy ? { createdBy: safeCreatedBy } : {}),
      };
    } catch (bErr) {
      console.error("[API CRASH LOG]: fromFlat bookmark parse error:", bErr, b);
      return {
        id:        `bm-err-${Math.random().toString(36).slice(2)}`,
        lat:       0,
        lng:       0,
        label:     "未命名書籤",
        createdAt: new Date().toISOString(),
      };
    }
  });

  // ── Sticky Notes ─────────────────────────────────────────────────────────
  const stickyNotes = (Array.isArray(flat.notes) ? flat.notes : []).map((n) => {
    try {
      // Defensive createdBy for the note itself
      const rawCB = (n as unknown as Record<string, unknown>)["createdBy"];
      const cbObj = rawCB && typeof rawCB === "object" ? rawCB as Record<string, unknown> : null;
      const safeCreatedBy = cbObj
        ? { name: String(cbObj["name"] || "系統管理員"), email: String(cbObj["email"] || "system") }
        : undefined;

      // Defensive comments array
      const rawComments = (n as unknown as Record<string, unknown>)["comments"];
      const safeComments = Array.isArray(rawComments)
        ? rawComments.map((c) => {
            try {
              const cObj = c && typeof c === "object" ? c as Record<string, unknown> : {};
              const cCB  = cObj["createdBy"] && typeof cObj["createdBy"] === "object"
                ? cObj["createdBy"] as Record<string, unknown>
                : null;
              return {
                id:        typeof cObj["id"] === "string" && cObj["id"] ? String(cObj["id"]) : `cmt-legacy-${Math.random().toString(36).slice(2)}`,
                text:      typeof cObj["text"] === "string"             ? String(cObj["text"])      : "",
                createdAt: typeof cObj["createdAt"] === "string"        ? String(cObj["createdAt"]) : new Date().toISOString(),
                createdBy: {
                  name:  String(cCB?.["name"]  || "匿名"),
                  email: String(cCB?.["email"] || "unknown"),
                },
              };
            } catch (cErr) {
              console.error("[API CRASH LOG]: fromFlat comment parse error:", cErr, c);
              return {
                id:        `cmt-err-${Math.random().toString(36).slice(2)}`,
                text:      "",
                createdAt: new Date().toISOString(),
                createdBy: { name: "匿名", email: "unknown" },
              };
            }
          })
        : [];

      const nAny = n as unknown as Record<string, unknown>;
      return {
        id:        typeof n.id === "string" && n.id        ? n.id        : `note-legacy-${Math.random().toString(36).slice(2)}`,
        lat:       typeof n.lat === "number"               ? n.lat       : 0,
        lng:       typeof n.lng === "number"               ? n.lng       : 0,
        content:   typeof n.content === "string"           ? n.content   : (typeof nAny["text"] === "string" ? String(nAny["text"]) : ""),
        color:     typeof n.color === "string" && n.color  ? n.color     : "#fef68a",
        createdAt: typeof n.createdAt === "string"         ? n.createdAt : new Date().toISOString(),
        comments:  safeComments,
        ...(safeCreatedBy ? { createdBy: safeCreatedBy } : {}),
      };
    } catch (nErr) {
      console.error("[API CRASH LOG]: fromFlat note parse error:", nErr, n);
      return {
        id:        `note-err-${Math.random().toString(36).slice(2)}`,
        lat:       0,
        lng:       0,
        content:   "",
        color:     "#fef68a",
        createdAt: new Date().toISOString(),
        comments:  [],
      };
    }
  });

  // ── Todos ────────────────────────────────────────────────────────────────
  const todos = (Array.isArray(flat.todos) ? flat.todos : []).map((t) => {
    try {
      // Defensive createdBy for todos
      const rawCB = (t as unknown as Record<string, unknown>)["createdBy"];
      const cbObj = rawCB && typeof rawCB === "object" ? rawCB as Record<string, unknown> : null;
      const safeCreatedBy = cbObj
        ? { name: String(cbObj["name"] || "系統管理員"), email: String(cbObj["email"] || "system") }
        : undefined;

      return {
        id:                 typeof t.id === "string" && t.id          ? t.id        : `todo-legacy-${Math.random().toString(36).slice(2)}`,
        text:               typeof t.text === "string"                ? t.text      : "",
        completed:          typeof t.completed === "boolean"          ? t.completed : false,
        reminderDate:       t.reminderDate       != null              ? t.reminderDate       : null,
        reminderBookmarkId: t.reminderBookmarkId != null              ? t.reminderBookmarkId : null,
        createdAt:          typeof t.createdAt === "string"           ? t.createdAt : new Date().toISOString(),
        ...(safeCreatedBy ? { createdBy: safeCreatedBy } : {}),
      };
    } catch (tErr) {
      console.error("[API CRASH LOG]: fromFlat todo parse error:", tErr, t);
      return {
        id:                 `todo-err-${Math.random().toString(36).slice(2)}`,
        text:               "",
        completed:          false,
        reminderDate:       null,
        reminderBookmarkId: null,
        createdAt:          new Date().toISOString(),
      };
    }
  });

  // ── Invited Users ─────────────────────────────────────────────────────────
  const rawInvited = (flat as unknown as Record<string, unknown>)["invitedUsers"];
  const invitedUsers: string[] = Array.isArray(rawInvited)
    ? rawInvited.filter((e): e is string => typeof e === "string")
    : [ADMIN_EMAIL];

  // Always ensure admin is in the list
  if (!invitedUsers.map((e) => e.toLowerCase()).includes(ADMIN_EMAIL)) {
    invitedUsers.unshift(ADMIN_EMAIL);
  }

  return { bookmarks, stickyNotes, todos, invitedUsers, updatedAt: new Date().toISOString() };
}

// ── Per-user in-process cache ──────────────────────────────────────────────
// Key: filePath (includes the user-specific segment)
const dataCache = new Map<string, AppData>();
const shaCache  = new Map<string, string>();

export function getDefaultAppData(): AppData {
  return {
    bookmarks:    [],
    stickyNotes:  [],
    todos:        [],
    invitedUsers: [ADMIN_EMAIL],
    updatedAt:    new Date().toISOString(),
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
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
      cache: "no-store",
      next: { revalidate: 0 },
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

    let fileData: Record<string, unknown>;
    try {
      fileData = await res.json();
    } catch (jsonErr) {
      console.error("[API CRASH LOG]: GitHub API response was not valid JSON:", jsonErr);
      const def = getDefaultAppData();
      dataCache.set(filePath, def);
      return def;
    }

    if (typeof fileData.sha === "string") {
      shaCache.set(filePath, fileData.sha);
    }

    let flat: FlatStorageSchema;
    try {
      const raw = Buffer.from(String(fileData.content ?? ""), "base64").toString("utf-8");
      flat = JSON.parse(raw) as FlatStorageSchema;
    } catch (parseErr) {
      console.error("[API CRASH LOG]: Failed to decode/parse GitHub file content:", parseErr);
      const def = getDefaultAppData();
      dataCache.set(filePath, def);
      return def;
    }

    // Tolerate files saved with the old schema (had stickyNotes key)
    const flatAny = (flat as unknown) as Record<string, unknown>;
    const normalised: FlatStorageSchema = {
      bookmarks:    flat.bookmarks    ?? (flatAny["bookmarks"] as Bookmark[])    ?? [],
      notes:        flat.notes        ?? (flatAny["stickyNotes"] as StickyNote[]) ?? [],
      todos:        flat.todos        ?? [],
      invitedUsers: flat.invitedUsers ?? (flatAny["invitedUsers"] as string[])   ?? [ADMIN_EMAIL],
    };

    let appData: AppData;
    try {
      appData = fromFlat(normalised);
    } catch (fromFlatErr) {
      console.error("[API CRASH LOG]: fromFlat threw unexpectedly:", fromFlatErr);
      const def = getDefaultAppData();
      dataCache.set(filePath, def);
      return def;
    }

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
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
        cache: "no-store",
        next: { revalidate: 0 },
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
