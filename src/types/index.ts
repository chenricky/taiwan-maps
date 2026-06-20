// ── Shared author identity ─────────────────────────────────────────────────
export interface NoteAuthor {
  name:  string;
  email: string;
}

// ── Bookmark ───────────────────────────────────────────────────────────────
export interface Bookmark {
  id:        string;
  lat:       number;
  lng:       number;
  label:     string;
  createdAt: string;
  /** Optional — bookmarks created before auth was added won't have this */
  createdBy?: NoteAuthor;
}

// ── Individual comment inside a sticky note ────────────────────────────────
export interface NoteComment {
  id:        string;
  text:      string;
  createdAt: string;
  createdBy: NoteAuthor;
}

// ── Sticky Note (threaded post) ────────────────────────────────────────────
export interface StickyNote {
  id:        string;
  lat:       number;
  lng:       number;
  /** The original post body (was `content` in v1 — kept as alias below) */
  content:   string;
  color:     string;
  createdAt: string;
  /** Optional — notes created before auth was added won't have this */
  createdBy?: NoteAuthor;
  /** Discussion thread — defaults to [] for older notes */
  comments:  NoteComment[];
}

// ── Todo Item ──────────────────────────────────────────────────────────────
export interface TodoItem {
  id:                  string;
  text:                string;
  completed:           boolean;
  reminderDate?:       string | null;
  reminderBookmarkId?: string | null;
  createdAt:           string;
  /** Optional — todos created before auth was added won't have this */
  createdBy?: NoteAuthor;
}

export interface AppData {
  bookmarks:   Bookmark[];
  stickyNotes: StickyNote[];
  todos:       TodoItem[];
  updatedAt:   string;
}

export interface RoutePoint {
  lat: number;
  lng: number;
}

export type TravelMode = "driving" | "walking" | "cycling";

export interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  place_id: string;
}
