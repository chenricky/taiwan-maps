export interface Bookmark {
  id: string;
  lat: number;
  lng: number;
  label: string;
  createdAt: string;
}

export interface StickyNote {
  id: string;
  lat: number;
  lng: number;
  content: string;
  color: string;
  createdAt: string;
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  reminderDate?: string | null;
  reminderBookmarkId?: string | null;
  createdAt: string;
}

export interface AppData {
  bookmarks: Bookmark[];
  stickyNotes: StickyNote[];
  todos: TodoItem[];
  updatedAt: string;
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