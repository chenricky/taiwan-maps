"use client";

import { useState } from "react";
import { StickyNote, Bookmark } from "@/types";
import MobileSearchStrip, { SearchConfig } from "@/components/MobileSearchStrip";

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

// ── Types ─────────────────────────────────────────────────────────────────────

/** One toggleable map layer — handed down from page.tsx */
export interface LayerItem {
  key:          string;
  label:        string;
  icon:         string;
  activeColor:  string;
  activeBorder: string;
  activeText:   string;
  active:       boolean;
  onToggle:     () => void;
}

type Tab = "notes" | "bookmarks" | "layers";

const TABS: { key: Tab; label: string }[] = [
  { key: "notes",     label: "📝 便利貼" },
  { key: "bookmarks", label: "📌 書籤"   },
  { key: "layers",    label: "🗂️ 圖層"   },
];

// STRIP_PX: height of the search/auth bar sitting above the handle
const STRIP_PX  = 60;
// HANDLE_PX: height of the drag-pill + summary row
const HANDLE_PX = 56;
const SHEET_VH  = "72vh";

interface Props {
  notes:            StickyNote[];
  bookmarks:        Bookmark[];
  layers:           LayerItem[];
  onSelectNote:     (note: StickyNote) => void;
  onSelectBookmark: (bm: Bookmark)     => void;
  /** Lifted to page.tsx so the layer panel can react to expansion */
  expanded:         boolean;
  onExpandedChange: (v: boolean) => void;
  /** Search bar + auth FAB rendered above the drag handle */
  searchConfig:     SearchConfig;
}

// ── Shared icons ──────────────────────────────────────────────────────────────

function FlyIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}
      viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MobileBottomSheet({
  notes, bookmarks, layers,
  onSelectNote, onSelectBookmark,
  expanded, onExpandedChange,
  searchConfig,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("notes");

  const sortedNotes = [...notes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const handleNoteClick = (note: StickyNote) => {
    onSelectNote(note);
    onExpandedChange(false);
  };

  const handleBookmarkClick = (bm: Bookmark) => {
    onSelectBookmark(bm);
    onExpandedChange(false);
  };

  const activeLayers = layers.filter(l => l.active).length;

  return (
    <>
      {/* Backdrop — tap to collapse */}
      {expanded && (
        <div
          className="md:hidden fixed inset-0 z-[1999] bg-black/30"
          onClick={() => onExpandedChange(false)}
        />
      )}

      {/* ── Sheet ─────────────────────────────────────────────────────────── */}
      {/*
        Collapsed: translateY pushes sheet down so only HANDLE_PX + safe-area-bottom is visible.
        Safe-area-inset-bottom pushes the pill ABOVE the iOS home indicator.
      */}
      <div
        className={`
          md:hidden fixed bottom-0 left-0 right-0 z-[2000]
          flex flex-col
          bg-white/85 backdrop-blur-xl
          border-t border-x border-white/40
          shadow-[0_-8px_30px_-4px_rgba(0,0,0,0.14)]
          rounded-t-2xl
          transition-transform duration-300 ease-out
        `}
        style={{
          height: SHEET_VH,
          transform: expanded
            ? "translateY(0)"
            : `translateY(calc(${SHEET_VH} - ${STRIP_PX + HANDLE_PX}px - env(safe-area-inset-bottom, 0px) - 0.5rem))`,
        }}
      >

        {/* ── Search strip — always visible, docked above the handle ── */}
        <MobileSearchStrip {...searchConfig} />

        {/* ── Handle / collapsed pill ── */}
        <div
          role="button"
          aria-expanded={expanded}
          aria-label={expanded ? "收起面板" : "展開便利貼、書籤與圖層"}
          tabIndex={0}
          className="relative shrink-0 flex items-center px-4 cursor-pointer select-none
                     active:bg-white/30 rounded-t-2xl transition-colors
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60"
          style={{
            // The pb absorbs the safe-area gap so the pill content stays centred
            // above the home indicator, while the transform accounts for it.
            paddingTop:    12,
            paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + 0.5rem)`,
          }}
          onClick={() => onExpandedChange(!expanded)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onExpandedChange(!expanded);
          }}
        >
          {/* Drag indicator pill */}
          <span className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-[3px] bg-gray-400/60 rounded-full" />

          {/* Compact counts — three data points in one line */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0 mt-1">
            <span className="text-sm font-semibold text-gray-800 whitespace-nowrap">
              📝 {notes.length}
            </span>
            <span className="text-gray-300 text-xs">·</span>
            <span className="text-sm font-semibold text-gray-800 whitespace-nowrap">
              📌 {bookmarks.length}
            </span>
            <span className="text-gray-300 text-xs">·</span>
            <span className="text-sm font-semibold text-gray-800 whitespace-nowrap">
              🗂️ {activeLayers}/{layers.length}
            </span>
          </div>

          {/* Chevron — animates 180° when expanded */}
          <svg
            className={`shrink-0 w-5 h-5 text-gray-500 transition-transform duration-300 mt-1 ${expanded ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </div>

        {/* ── Sheet body (more opaque for legibility) ── */}
        <div className="bg-white/96 flex flex-col flex-1 overflow-hidden">

          {/* ── Tab bar ── */}
          <div className="shrink-0 flex border-b border-gray-100/90">
            {TABS.map(tab => {
              const isActive = activeTab === tab.key;
              const accentClass = isActive
                ? tab.key === "notes"     ? "text-amber-600 border-b-2 border-amber-500"
                : tab.key === "bookmarks" ? "text-blue-600 border-b-2 border-blue-500"
                :                           "text-slate-700 border-b-2 border-slate-500"
                : "text-gray-400";
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
          <div className="flex-1 min-h-0 overflow-y-auto">

            {/* Notes */}
            {activeTab === "notes" && (
              sortedNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-6 py-10">
                  <span className="text-4xl mb-3 select-none opacity-40">📝</span>
                  <p className="text-sm font-semibold text-gray-500">還沒有便利貼</p>
                  <p className="text-xs mt-1.5 text-gray-400 leading-relaxed">
                    點擊地圖任意位置即可新增
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100/90">
                  {sortedNotes.map(note => {
                    const author       = note.createdBy?.name ?? "匿名";
                    const commentCount = note.comments?.length ?? 0;
                    return (
                      <li
                        key={note.id}
                        role="button" tabIndex={0}
                        onClick={() => handleNoteClick(note)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleNoteClick(note); }}
                        className="flex items-start gap-3 px-4 py-3.5 active:bg-amber-50/80 cursor-pointer
                                   focus:outline-none focus-visible:bg-amber-50"
                      >
                        <div className="shrink-0 w-[3px] self-stretch rounded-full mt-0.5"
                          style={{ backgroundColor: note.color }} />
                        <div
                          className={`shrink-0 w-9 h-9 rounded-full ${avatarColor(author)}
                                      flex items-center justify-center text-white text-xs font-bold leading-none shadow-sm`}
                          title={author}
                        >
                          {nameInitials(author)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2 mb-0.5">
                            <span className="text-sm font-semibold text-gray-800 truncate">{author}</span>
                            <span className="text-[11px] text-gray-400 shrink-0 tabular-nums">
                              {timeAgo(note.createdAt)}
                            </span>
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
                <div className="flex flex-col items-center justify-center h-full text-center px-6 py-10">
                  <span className="text-4xl mb-3 select-none opacity-40">📌</span>
                  <p className="text-sm font-semibold text-gray-500">還沒有書籤</p>
                  <p className="text-xs mt-1.5 text-gray-400 leading-relaxed">
                    點擊地圖即可新增書籤
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100/90">
                  {bookmarks.map(bm => (
                    <li
                      key={bm.id}
                      role="button" tabIndex={0}
                      onClick={() => handleBookmarkClick(bm)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleBookmarkClick(bm); }}
                      className="flex items-center gap-3 px-4 py-3.5 active:bg-blue-50/80 cursor-pointer
                                 focus:outline-none focus-visible:bg-blue-50"
                    >
                      <div className="shrink-0 w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-base shadow-sm">
                        📍
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-800 truncate">{bm.label}</p>
                        <p className="text-[11px] text-gray-400 font-mono">
                          {bm.lat.toFixed(4)}, {bm.lng.toFixed(4)}
                        </p>
                        {bm.createdBy?.name && (
                          <p className="text-[11px] text-gray-400 mt-0.5">by {bm.createdBy.name}</p>
                        )}
                      </div>
                      <div className="shrink-0 text-gray-300"><FlyIcon /></div>
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
                      className={`
                        flex items-center gap-2 min-h-[52px] w-full px-3 py-2.5
                        rounded-xl border font-medium text-left
                        transition-all duration-150
                        ${layer.active
                          ? `${layer.activeColor} ${layer.activeBorder} ${layer.activeText} shadow-sm`
                          : "bg-gray-50/90 border-gray-200 text-gray-600 active:bg-gray-100"
                        }
                      `}
                    >
                      <span className="text-lg leading-none shrink-0">{layer.icon}</span>
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
      </div>
    </>
  );
}
