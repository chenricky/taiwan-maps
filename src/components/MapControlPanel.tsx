"use client";

import { useState } from "react";
import { StickyNote, Bookmark } from "@/types";
import { LayerItem } from "@/components/MobileBottomSheet";

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60)    return "剛剛";
  if (secs < 3600)  return `${Math.floor(secs / 60)} 分鐘前`;
  if (secs < 86400) return `${Math.floor(secs / 3600)} 小時前`;
  const days = Math.floor(secs / 86400);
  if (days < 30)    return `${days} 天前`;
  return new Date(iso).toLocaleDateString("zh-TW", { month: "short", day: "numeric" });
}

const AVATAR_PALETTE = [
  "bg-blue-500",  "bg-emerald-500", "bg-violet-500", "bg-rose-500",
  "bg-amber-500", "bg-teal-500",    "bg-indigo-500", "bg-pink-500",
];

function avatarColor(name: string): string {
  let h = 0;
  for (const ch of name) h = ((h * 31) + ch.charCodeAt(0)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

function nameInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

function FlyIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}
      viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "notes" | "bookmarks" | "layers";

const TABS: { key: Tab; label: string }[] = [
  { key: "notes",     label: "📝 便利貼" },
  { key: "bookmarks", label: "📌 書籤"   },
  { key: "layers",    label: "🗂️ 圖層"   },
];

interface Props {
  notes:            StickyNote[];
  bookmarks:        Bookmark[];
  layers:           LayerItem[];
  onSelectNote:     (note: StickyNote) => void;
  onSelectBookmark: (bm: Bookmark) => void;
  onDeleteBookmark: (id: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
// Desktop-only combined panel — merges the bookmarks drawer, sticky-notes drawer,
// and layer toggle panel into a single tabbed pane (mirrors MobileBottomSheet's
// tab structure), docked top-left and expanded by default for a cleaner map view.
export default function MapControlPanel({
  notes, bookmarks, layers,
  onSelectNote, onSelectBookmark, onDeleteBookmark,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("notes");
  const [open, setOpen] = useState(true);

  const sortedNotes = [...notes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const activeLayers = layers.filter(l => l.active).length;

  return (
    <div className="hidden md:flex absolute top-3 left-3 z-[1000] flex-col w-72 pointer-events-none">
      <div
        className="pointer-events-auto bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col"
        style={{ maxHeight: "85vh" }}
      >
        {/* ── Header: counts + collapse toggle ── */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full shrink-0 flex items-center justify-between px-3 py-2.5 bg-gray-50 border-b border-gray-200 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-semibold text-gray-800 whitespace-nowrap">📝 {notes.length}</span>
            <span className="text-gray-300 text-xs">·</span>
            <span className="text-sm font-semibold text-gray-800 whitespace-nowrap">📌 {bookmarks.length}</span>
            <span className="text-gray-300 text-xs">·</span>
            <span className="text-sm font-semibold text-gray-800 whitespace-nowrap">🗂️ {activeLayers}/{layers.length}</span>
          </div>
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${open ? "" : "rotate-180"}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>

        {open && (
          <div className="flex flex-col min-h-0">
            {/* ── Tab bar ── */}
            <div className="shrink-0 flex border-b border-gray-100">
              {TABS.map(tab => {
                const isActive = activeTab === tab.key;
                const accentClass = isActive
                  ? tab.key === "notes"     ? "text-amber-600 border-b-2 border-amber-500"
                  : tab.key === "bookmarks" ? "text-blue-600 border-b-2 border-blue-500"
                  :                           "text-slate-700 border-b-2 border-slate-500"
                  : "text-gray-400 hover:text-gray-600";
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${accentClass}`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* ── Scrollable content ── */}
            <div className="min-h-0 overflow-y-auto">

              {/* Notes */}
              {activeTab === "notes" && (
                sortedNotes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center px-6 py-10">
                    <span className="text-4xl mb-3 select-none opacity-40">📝</span>
                    <p className="text-sm font-semibold text-gray-500">還沒有便利貼</p>
                    <p className="text-xs mt-1.5 text-gray-400 leading-relaxed">點擊地圖任意位置即可新增</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {sortedNotes.map(note => {
                      const author       = note.createdBy?.name ?? "匿名";
                      const commentCount = note.comments?.length ?? 0;
                      return (
                        <li
                          key={note.id}
                          role="button" tabIndex={0}
                          onClick={() => onSelectNote(note)}
                          onKeyDown={(e) => { if (e.key === "Enter") onSelectNote(note); }}
                          className="flex items-start gap-2.5 px-3 py-3 hover:bg-amber-50/80 cursor-pointer
                                     focus:outline-none focus-visible:bg-amber-50"
                        >
                          <div className="shrink-0 w-[3px] self-stretch rounded-full mt-0.5"
                            style={{ backgroundColor: note.color }} />
                          <div
                            className={`shrink-0 w-7 h-7 rounded-full ${avatarColor(author)}
                                        flex items-center justify-center text-white text-[10px] font-bold leading-none shadow-sm`}
                            title={author}
                          >
                            {nameInitials(author)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2 mb-0.5">
                              <span className="text-xs font-semibold text-gray-800 truncate">{author}</span>
                              <span className="text-[10px] text-gray-400 shrink-0 tabular-nums">{timeAgo(note.createdAt)}</span>
                            </div>
                            <p className="text-[11px] text-gray-600 line-clamp-2 leading-snug">
                              {note.content || <span className="text-gray-400 italic">（空白便利貼）</span>}
                            </p>
                            {commentCount > 0 && (
                              <span className="text-[10px] text-blue-500 font-medium mt-0.5 block">💬 {commentCount} 則留言</span>
                            )}
                          </div>
                          <div className="shrink-0 self-center text-gray-300"><FlyIcon /></div>
                        </li>
                      );
                    })}
                  </ul>
                )
              )}

              {/* Bookmarks */}
              {activeTab === "bookmarks" && (
                bookmarks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center px-6 py-10">
                    <span className="text-4xl mb-3 select-none opacity-40">📌</span>
                    <p className="text-sm font-semibold text-gray-500">還沒有書籤</p>
                    <p className="text-xs mt-1.5 text-gray-400 leading-relaxed">點擊地圖即可新增書籤</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {bookmarks.map(bm => (
                      <li
                        key={bm.id}
                        className="group flex items-center gap-2.5 px-3 py-3 hover:bg-blue-50/80"
                      >
                        <button
                          onClick={() => onSelectBookmark(bm)}
                          className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
                        >
                          <div className="shrink-0 w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-sm shadow-sm">
                            📍
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-gray-800 truncate">{bm.label}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{bm.lat.toFixed(4)}, {bm.lng.toFixed(4)}</p>
                            {bm.createdBy?.name && (
                              <p className="text-[10px] text-gray-400 mt-0.5">by {bm.createdBy.name}</p>
                            )}
                          </div>
                        </button>
                        <button
                          onClick={() => onDeleteBookmark(bm.id)}
                          className="shrink-0 p-1 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 rounded transition-all"
                          title="刪除書籤"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )
              )}

              {/* Layers */}
              {activeTab === "layers" && (
                <div className="p-3">
                  <div className="grid grid-cols-2 gap-2">
                    {layers.map(layer => (
                      <button
                        key={layer.key}
                        onClick={layer.onToggle}
                        title={`${layer.active ? "隱藏" : "顯示"} ${layer.label}`}
                        className={`
                          flex items-center gap-2 min-h-[48px] w-full px-3 py-2.5
                          rounded-lg border font-medium text-left
                          transition-all duration-150
                          ${layer.active
                            ? `${layer.activeColor} ${layer.activeBorder} ${layer.activeText} shadow-sm`
                            : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300"
                          }
                        `}
                      >
                        <span className="text-base leading-none shrink-0">{layer.icon}</span>
                        <span className="text-xs leading-tight font-semibold">{layer.label}</span>
                        {layer.active && (
                          <span className="ml-auto w-2 h-2 rounded-full bg-white/70 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-400 text-center mt-3 select-none">
                    {activeLayers} / {layers.length} 個圖層已開啟
                  </p>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
