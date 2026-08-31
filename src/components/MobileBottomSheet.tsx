"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  StickyNote as StickyNoteIcon,
  Bookmark as BookmarkIcon,
  Calendar,
  Layers,
  ChevronDown,
  MessageCircle,
  Clock,
  Trash2,
  Navigation,
  type LucideIcon,
} from "lucide-react";
import { StickyNote, Bookmark, TodayLocation } from "@/types";
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

// Local (not UTC) "YYYY-MM-DD" — matches how TodayLocation.planDate is stamped on save.
function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// "14:00" -> "2:00 PM"
function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

// Calibrated 6-hue set for person-avatars — deliberately excludes amber/blue/emerald,
// which are reserved for notes/bookmarks/today category identity.
const AVATAR_PALETTE = [
  "bg-violet-500", "bg-indigo-500", "bg-teal-500",
  "bg-rose-500",   "bg-fuchsia-500", "bg-cyan-500",
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

type Tab = "notes" | "bookmarks" | "today" | "layers";

const TABS: { key: Tab; label: string; icon: LucideIcon }[] = [
  { key: "notes",     label: "便利貼", icon: StickyNoteIcon },
  { key: "bookmarks", label: "書籤",   icon: BookmarkIcon   },
  { key: "today",     label: "今日",   icon: Calendar       },
  { key: "layers",    label: "圖層",   icon: Layers         },
];

// Fallback peek height (search strip + handle) for the very first paint, before the
// ResizeObserver below has measured the real thing — refined immediately on mount.
const PEEK_PX_FALLBACK = 116;
const SHEET_VH = "72vh";

interface Props {
  notes:            StickyNote[];
  bookmarks:        Bookmark[];
  todayLocations:   TodayLocation[];
  layers:           LayerItem[];
  onSelectNote:     (note: StickyNote) => void;
  onSelectBookmark: (bm: Bookmark)     => void;
  onDeleteBookmark: (id: string)       => void;
  onSelectTodayLocation: (loc: TodayLocation) => void;
  /** Which tabs to show — controlled by the gear-icon settings popover on the map */
  visibleTabs:      Record<Tab, boolean>;
  /** Lifted to page.tsx so the layer panel can react to expansion */
  expanded:         boolean;
  onExpandedChange: (v: boolean) => void;
  /** Search bar + auth FAB rendered above the drag handle */
  searchConfig:     SearchConfig;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MobileBottomSheet({
  notes, bookmarks, todayLocations, layers,
  onSelectNote, onSelectBookmark, onDeleteBookmark, onSelectTodayLocation,
  visibleTabs,
  expanded, onExpandedChange,
  searchConfig,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("notes");

  // Measure the real rendered height of the "peek" region (search strip + handle)
  // instead of hardcoding it — its true height depends on font metrics, safe-area
  // insets, and content, all of which drift as the design changes. A stale hardcoded
  // guess made the collapsed sheet peek too far and crop into the tab bar below.
  const peekRef = useRef<HTMLDivElement>(null);
  const [peekPx, setPeekPx] = useState(PEEK_PX_FALLBACK);
  useLayoutEffect(() => {
    const el = peekRef.current;
    if (!el) return;
    const measure = () => setPeekPx(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Guards against a fast double-tap: once a delete is in flight the list is about to
  // shift (the removed row disappears), so a near-simultaneous second tap could land on
  // whatever now occupies that spot instead of its intended target.
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const visibleTabList = TABS.filter((t) => visibleTabs[t.key]);

  // If the stored activeTab gets hidden via the settings popover, fall back to the
  // first still-visible tab. Derived at render time (not via effect+setState) so
  // there's no stale-tab flash, and `activeTab` naturally becomes valid again on
  // its own if the user re-enables that tab later.
  const effectiveTab: Tab | undefined = visibleTabs[activeTab] ? activeTab : visibleTabList[0]?.key;

  const sortedNotes = [...notes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const todayStr = todayDateStr();
  const todaysLocations = todayLocations
    .filter((loc) => loc.planDate === todayStr)
    .sort((a, b) => (a.timeStart ?? "99:99").localeCompare(b.timeStart ?? "99:99"));

  const handleDeleteBookmarkClick = (id: string) => {
    if (deletingId) return;
    setDeletingId(id);
    onDeleteBookmark(id);
    // The bookmark disappears once `bookmarks` updates from the parent; this timeout is
    // just a safety net in case that round-trip stalls, so the list never stays locked.
    setTimeout(() => setDeletingId(null), 1000);
  };

  const handleNoteClick = (note: StickyNote) => {
    onSelectNote(note);
    onExpandedChange(false);
  };

  const handleBookmarkClick = (bm: Bookmark) => {
    onSelectBookmark(bm);
    onExpandedChange(false);
  };

  const handleTodayLocationClick = (loc: TodayLocation) => {
    onSelectTodayLocation(loc);
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
          md:hidden fixed bottom-0 left-4 right-4 w-auto z-[2000]
          flex flex-col
          bg-white/85 backdrop-blur-xl
          border border-white/30
          shadow-[0_-6px_24px_-2px_rgba(0,0,0,0.18),0_0_16px_rgba(0,0,0,0.08)]
          rounded-2xl
          transition-transform duration-300 ease-out
        `}
        style={{
          height: SHEET_VH,
          transform: expanded
            ? "translateY(0)"
            : `translateY(calc(${SHEET_VH} - ${peekPx}px))`,
        }}
      >

        {/* ── Peek region — search strip + handle, its real height drives the collapsed offset above ── */}
        <div ref={peekRef} className="shrink-0">
          {/* ── Search strip — always visible, docked above the handle ── */}
          <MobileSearchStrip {...searchConfig} />

          {/* ── Handle / collapsed pill ── */}
          <div
            role="button"
            aria-expanded={expanded}
            aria-label={expanded ? "收起面板" : "展開便利貼、書籤與圖層"}
            tabIndex={0}
            className="relative flex items-center px-4 cursor-pointer select-none
                       active:bg-white/30 rounded-t-2xl transition-colors
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60"
            style={{
              // The pb absorbs the safe-area gap so the pill content stays centred
              // above the home indicator, while the peek measurement (offsetHeight)
              // captures the true rendered height including this padding.
              paddingTop:    12,
              paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + 0.5rem)`,
            }}
            onClick={() => onExpandedChange(!expanded)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onExpandedChange(!expanded);
            }}
          >
            {/* Drag indicator pill */}
            <span className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-[3px] bg-slate-400/60 rounded-full" />

            {/* Compact counts — four data points in one line */}
            <div className="flex items-center gap-2.5 flex-1 min-w-0 mt-1 overflow-x-auto">
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-800 whitespace-nowrap">
                <StickyNoteIcon className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />{notes.length}
              </span>
              <span className="text-slate-300 text-xs">·</span>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-800 whitespace-nowrap">
                <BookmarkIcon className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />{bookmarks.length}
              </span>
              <span className="text-slate-300 text-xs">·</span>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-800 whitespace-nowrap">
                <Calendar className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />{todaysLocations.length}
              </span>
              <span className="text-slate-300 text-xs">·</span>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-800 whitespace-nowrap">
                <Layers className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />{activeLayers}/{layers.length}
              </span>
            </div>

            {/* Chevron — animates 180° when expanded */}
            <ChevronDown
              className={`shrink-0 w-5 h-5 text-slate-500 transition-transform duration-300 mt-1 ${expanded ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </div>
        </div>

        {/* ── Sheet body (more opaque for legibility) ── */}
        <div className="bg-white/96 flex flex-col flex-1 overflow-hidden">

          {/* ── Tab bar ── */}
          <div className="shrink-0 flex border-b border-slate-100/90">
            {visibleTabList.map(tab => {
              const isActive = effectiveTab === tab.key;
              const accentClass = isActive
                ? tab.key === "notes"     ? "text-amber-600 border-b-2 border-amber-500"
                : tab.key === "bookmarks" ? "text-blue-600 border-b-2 border-blue-500"
                : tab.key === "today"     ? "text-emerald-600 border-b-2 border-emerald-500"
                :                           "text-slate-700 border-b-2 border-slate-500"
                : "text-slate-400";
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 py-2.5 flex flex-col items-center gap-0.5 text-xs font-semibold transition-colors ${accentClass}`}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ── Scrollable content ── */}
          <div className="flex-1 min-h-0 overflow-y-auto">

            {/* Notes */}
            {effectiveTab === "notes" && (
              sortedNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-6 py-10">
                  <StickyNoteIcon className="w-10 h-10 mb-3 text-slate-300" aria-hidden="true" />
                  <p className="text-sm font-semibold text-slate-500">還沒有便利貼</p>
                  <p className="text-xs mt-1.5 text-slate-400 leading-relaxed">
                    點擊地圖任意位置即可新增
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100/90">
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
                            <span className="text-sm font-semibold text-slate-800 truncate">{author}</span>
                            <span className="text-[11px] text-slate-400 shrink-0 tabular-nums">
                              {timeAgo(note.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 line-clamp-2 leading-snug">
                            {note.content || <span className="text-slate-400 italic">（空白便利貼）</span>}
                          </p>
                          {commentCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-full mt-1">
                              <MessageCircle className="w-3 h-3" aria-hidden="true" />{commentCount} 則留言
                            </span>
                          )}
                        </div>
                        <div className="shrink-0 self-center text-slate-300"><Navigation className="w-4 h-4" aria-hidden="true" /></div>
                      </li>
                    );
                  })}
                </ul>
              )
            )}

            {/* Bookmarks */}
            {effectiveTab === "bookmarks" && (
              bookmarks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-6 py-10">
                  <BookmarkIcon className="w-10 h-10 mb-3 text-slate-300" aria-hidden="true" />
                  <p className="text-sm font-semibold text-slate-500">還沒有書籤</p>
                  <p className="text-xs mt-1.5 text-slate-400 leading-relaxed">
                    點擊地圖即可新增書籤
                  </p>
                </div>
              ) : (
                <ul className={`divide-y divide-slate-100/90 ${deletingId ? "pointer-events-none" : ""}`}>
                  {bookmarks.map(bm => (
                    <li key={bm.id} className={`flex items-center gap-1 px-4 py-3.5 transition-opacity ${deletingId === bm.id ? "opacity-40" : ""}`}>
                      <button
                        role="button" tabIndex={0}
                        onClick={() => handleBookmarkClick(bm)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleBookmarkClick(bm); }}
                        className="flex items-center gap-3 min-w-0 flex-1 text-left active:bg-blue-50/80 cursor-pointer
                                   focus:outline-none focus-visible:bg-blue-50"
                      >
                        <div className="shrink-0 w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center shadow-sm">
                          <BookmarkIcon className="w-4 h-4 text-white" aria-hidden="true" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-800 truncate">{bm.label}</p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {bm.lat.toFixed(4)}, {bm.lng.toFixed(4)}
                          </p>
                          {bm.createdBy?.name && (
                            <p className="text-[11px] text-slate-400 mt-0.5">by {bm.createdBy.name}</p>
                          )}
                        </div>
                        <div className="shrink-0 text-slate-300"><Navigation className="w-4 h-4" aria-hidden="true" /></div>
                      </button>
                      <button
                        onClick={() => handleDeleteBookmarkClick(bm.id)}
                        className="shrink-0 p-2 text-red-400 active:bg-red-50 active:text-red-600 rounded-lg transition-colors"
                        title="刪除書籤"
                        aria-label="刪除書籤"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )
            )}

            {/* Today's Locations */}
            {effectiveTab === "today" && (
              todaysLocations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-6 py-10">
                  <Calendar className="w-10 h-10 mb-3 text-slate-300" aria-hidden="true" />
                  <p className="text-sm font-semibold text-slate-500">今天還沒有安排地點</p>
                  <p className="text-xs mt-1.5 text-slate-400 leading-relaxed">
                    點擊地圖並選擇「新增今日行程」
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100/90">
                  {todaysLocations.map(loc => {
                    const author       = loc.createdBy?.name ?? "匿名";
                    const commentCount = loc.comments?.length ?? 0;
                    const timeWindow   = loc.timeStart
                      ? `${formatTime(loc.timeStart)}${loc.timeEnd ? ` – ${formatTime(loc.timeEnd)}` : ""}`
                      : null;
                    return (
                      <li
                        key={loc.id}
                        role="button" tabIndex={0}
                        onClick={() => handleTodayLocationClick(loc)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleTodayLocationClick(loc); }}
                        className="flex items-start gap-3 px-4 py-3.5 active:bg-emerald-50/80 cursor-pointer
                                   focus:outline-none focus-visible:bg-emerald-50"
                      >
                        <div
                          className={`shrink-0 w-9 h-9 rounded-full ${avatarColor(author)}
                                      flex items-center justify-center text-white text-xs font-bold leading-none shadow-sm`}
                          title={author}
                        >
                          {nameInitials(author)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2 mb-0.5">
                            <span className="text-sm font-semibold text-slate-800 truncate">{loc.label}</span>
                            <span className="text-[11px] text-slate-400 shrink-0 tabular-nums">
                              {timeAgo(loc.createdAt)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs text-slate-500">by {author}</span>
                            {timeWindow && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                <Clock className="w-3 h-3" aria-hidden="true" />{timeWindow}
                              </span>
                            )}
                          </div>
                          {commentCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-full mt-1">
                              <MessageCircle className="w-3 h-3" aria-hidden="true" />{commentCount} 則留言
                            </span>
                          )}
                        </div>
                        <div className="shrink-0 self-center text-slate-300"><Navigation className="w-4 h-4" aria-hidden="true" /></div>
                      </li>
                    );
                  })}
                </ul>
              )
            )}

            {/* Layers */}
            {effectiveTab === "layers" && (
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
                          : "bg-slate-50/90 border-slate-200 text-slate-600 active:bg-slate-100"
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
                <p className="text-[11px] text-slate-400 text-center mt-3 select-none">
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
