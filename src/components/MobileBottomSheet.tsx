"use client";

import { useState } from "react";
import { StickyNote, Bookmark } from "@/types";

// ── Helpers (mirrored from StickyNotesSidebar) ──────────────────────────────

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

// ── Constants ────────────────────────────────────────────────────────────────

const HANDLE_PX = 56;     // px — height of the always-visible collapsed pill
const SHEET_VH  = "75vh"; // total sheet height

// ── Types ────────────────────────────────────────────────────────────────────

type Tab = "notes" | "bookmarks";

interface Props {
  notes:            StickyNote[];
  bookmarks:        Bookmark[];
  onSelectNote:     (note: StickyNote) => void;
  onSelectBookmark: (bm: Bookmark)     => void;
}

// ── FlyIcon — shared map-pin SVG ─────────────────────────────────────────────

function FlyIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MobileBottomSheet({
  notes, bookmarks, onSelectNote, onSelectBookmark,
}: Props) {
  const [expanded, setExpanded]   = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("notes");

  const sortedNotes = [...notes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const handleNoteClick = (note: StickyNote) => {
    onSelectNote(note);
    setExpanded(false);
  };

  const handleBookmarkClick = (bm: Bookmark) => {
    onSelectBookmark(bm);
    setExpanded(false);
  };

  return (
    /* md:hidden — this entire component is invisible on desktop */
    <>
      {/* Semi-transparent backdrop when expanded — tap to collapse */}
      {expanded && (
        <div
          className="md:hidden fixed inset-0 z-[1999] bg-black/25"
          onClick={() => setExpanded(false)}
        />
      )}

      {/* ── Sheet ─────────────────────────────────────────────────────────── */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-[2000] flex flex-col transition-transform duration-300 ease-out"
        style={{
          height:    SHEET_VH,
          transform: expanded
            ? "translateY(0)"
            : `translateY(calc(${SHEET_VH} - ${HANDLE_PX}px))`,
        }}
      >
        {/* ── Collapsed handle / pill ── */}
        <div
          role="button"
          aria-expanded={expanded}
          aria-label={expanded ? "收起面板" : "展開便利貼與書籤清單"}
          tabIndex={0}
          className="relative shrink-0 bg-white rounded-t-2xl border-t border-gray-200
                     shadow-[0_-4px_24px_rgba(0,0,0,0.10)]
                     flex items-center px-4 cursor-pointer select-none
                     active:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          style={{ height: HANDLE_PX }}
          onClick={() => setExpanded((v) => !v)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setExpanded((v) => !v); }}
        >
          {/* Drag pill indicator */}
          <span className="absolute top-2.5 left-1/2 -translate-x-1/2 w-10 h-1 bg-gray-300 rounded-full" />

          {/* Summary counts */}
          <div className="flex items-center gap-3 mt-0.5 flex-1 min-w-0">
            <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
              📝&nbsp;{notes.length} 便利貼
            </span>
            <span className="text-gray-300 select-none">·</span>
            <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
              📌&nbsp;{bookmarks.length} 書籤
            </span>
          </div>

          {/* Chevron rotates when expanded */}
          <svg
            className={`shrink-0 w-5 h-5 text-gray-400 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </div>

        {/* ── Scrollable sheet body ── */}
        <div className="bg-white flex flex-col flex-1 overflow-hidden">

          {/* Tab bar */}
          <div className="shrink-0 flex border-b border-gray-100">
            {(["notes", "bookmarks"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                  activeTab === tab
                    ? tab === "notes"
                      ? "text-amber-600 border-b-2 border-amber-500"
                      : "text-blue-600 border-b-2 border-blue-500"
                    : "text-gray-400"
                }`}
              >
                {tab === "notes" ? "📝 便利貼" : "📌 書籤"}
              </button>
            ))}
          </div>

          {/* Tab content — scrollable */}
          <div className="flex-1 min-h-0 overflow-y-auto">

            {/* ── Notes tab ── */}
            {activeTab === "notes" && (
              sortedNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-6 py-10">
                  <span className="text-4xl mb-3 select-none opacity-40">📝</span>
                  <p className="text-sm font-semibold text-gray-400">還沒有便利貼</p>
                  <p className="text-xs mt-1.5 text-gray-400 leading-relaxed">
                    點擊地圖任意位置即可新增
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {sortedNotes.map((note) => {
                    const author       = note.createdBy?.name ?? "匿名";
                    const commentCount = note.comments?.length ?? 0;
                    return (
                      <li
                        key={note.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleNoteClick(note)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleNoteClick(note); }}
                        className="flex items-start gap-3 px-4 py-3.5 active:bg-amber-50 cursor-pointer focus:outline-none focus-visible:bg-amber-50"
                      >
                        {/* Note-color stripe */}
                        <div
                          className="shrink-0 w-[3px] self-stretch rounded-full mt-0.5"
                          style={{ backgroundColor: note.color }}
                        />
                        {/* Author avatar */}
                        <div
                          className={`shrink-0 w-9 h-9 rounded-full ${avatarColor(author)} flex items-center justify-center text-white text-xs font-bold leading-none shadow-sm`}
                          title={author}
                        >
                          {nameInitials(author)}
                        </div>
                        {/* Text content */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2 mb-0.5">
                            <span className="text-sm font-semibold text-gray-800 truncate">{author}</span>
                            <span className="text-[11px] text-gray-400 shrink-0 tabular-nums">{timeAgo(note.createdAt)}</span>
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-2 leading-snug">
                            {note.content || <span className="text-gray-400 italic">（空白便利貼）</span>}
                          </p>
                          {commentCount > 0 && (
                            <span className="text-[11px] text-blue-500 font-medium mt-0.5 block">
                              💬 {commentCount} 則留言
                            </span>
                          )}
                        </div>
                        {/* Fly-to icon */}
                        <div className="shrink-0 self-center text-gray-300"><FlyIcon /></div>
                      </li>
                    );
                  })}
                </ul>
              )
            )}

            {/* ── Bookmarks tab ── */}
            {activeTab === "bookmarks" && (
              bookmarks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-6 py-10">
                  <span className="text-4xl mb-3 select-none opacity-40">📌</span>
                  <p className="text-sm font-semibold text-gray-400">還沒有書籤</p>
                  <p className="text-xs mt-1.5 text-gray-400 leading-relaxed">
                    點擊地圖即可新增書籤
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {bookmarks.map((bm) => (
                    <li
                      key={bm.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleBookmarkClick(bm)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleBookmarkClick(bm); }}
                      className="flex items-center gap-3 px-4 py-3.5 active:bg-blue-50 cursor-pointer focus:outline-none focus-visible:bg-blue-50"
                    >
                      {/* Bookmark avatar */}
                      <div className="shrink-0 w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-base shadow-sm">
                        📍
                      </div>
                      {/* Text */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-800 truncate">{bm.label}</p>
                        <p className="text-[11px] text-gray-400 font-mono">
                          {bm.lat.toFixed(4)}, {bm.lng.toFixed(4)}
                        </p>
                        {bm.createdBy?.name && (
                          <p className="text-[11px] text-gray-400 mt-0.5">by {bm.createdBy.name}</p>
                        )}
                      </div>
                      {/* Fly-to icon */}
                      <div className="shrink-0 text-gray-300"><FlyIcon /></div>
                    </li>
                  ))}
                </ul>
              )
            )}

          </div>
        </div>
      </div>
    </>
  );
}
