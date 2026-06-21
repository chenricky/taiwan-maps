"use client";

import { StickyNote } from "@/types";

// ── Helpers ────────────────────────────────────────────────────────────────

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
  "bg-blue-500",   "bg-emerald-500", "bg-violet-500", "bg-rose-500",
  "bg-amber-500",  "bg-teal-500",    "bg-indigo-500", "bg-pink-500",
];

function avatarColor(name: string): string {
  let h = 0;
  for (const ch of name) h = ((h * 31) + ch.charCodeAt(0)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

// ── Component ──────────────────────────────────────────────────────────────

interface Props {
  notes: StickyNote[];
  onSelectNote: (note: StickyNote) => void;
}

export default function StickyNotesSidebar({ notes, onSelectNote }: Props) {
  const sorted = [...notes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white">

      {/* ── Header ── */}
      <div className="shrink-0 px-3 py-2.5 bg-gradient-to-r from-yellow-50 to-amber-50 border-b border-amber-100 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-base leading-none select-none">📝</span>
          <span className="text-sm font-bold text-gray-800 tracking-tight">地圖便利貼</span>
        </div>
        {notes.length > 0 && (
          <span className="bg-yellow-400 text-yellow-900 text-[11px] font-bold px-2 py-0.5 rounded-full leading-none shadow-sm">
            {notes.length}
          </span>
        )}
      </div>

      {/* ── Empty state ── */}
      {sorted.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-5 py-10">
          <span className="text-4xl mb-3 select-none opacity-40">📝</span>
          <p className="text-sm font-semibold text-gray-400">還沒有便利貼</p>
          <p className="text-xs mt-1.5 text-gray-400 leading-relaxed">
            點擊地圖任意位置<br />即可新增一張便利貼
          </p>
        </div>
      ) : (

        /* ── Note list ── */
        <ul className="flex-1 min-h-0 overflow-y-auto divide-y divide-gray-50">
          {sorted.map((note) => {
            const author       = note.createdBy?.name ?? "匿名";
            const initStr      = initials(author);
            const avatarBg     = avatarColor(author);
            const commentCount = note.comments?.length ?? 0;

            return (
              <li
                key={note.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectNote(note)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelectNote(note); }}
                className="group flex items-start gap-2.5 px-3 py-3 cursor-pointer
                           hover:bg-amber-50/80 active:bg-amber-100
                           transition-colors duration-100
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400"
              >
                {/* Note-color accent stripe */}
                <div
                  className="shrink-0 w-[3px] self-stretch rounded-full mt-0.5"
                  style={{ backgroundColor: note.color }}
                />

                {/* Author avatar */}
                <div
                  className={`shrink-0 w-7 h-7 rounded-full ${avatarBg} flex items-center justify-center
                              text-white text-[10px] font-bold leading-none select-none shadow-sm`}
                  title={author}
                >
                  {initStr}
                </div>

                {/* Main text block */}
                <div className="min-w-0 flex-1">
                  {/* Author name + relative timestamp */}
                  <div className="flex items-baseline justify-between gap-1 mb-0.5">
                    <span className="text-xs font-semibold text-gray-800 truncate">{author}</span>
                    <span className="text-[10px] text-gray-400 shrink-0 tabular-nums">
                      {timeAgo(note.createdAt)}
                    </span>
                  </div>

                  {/* Note content snippet */}
                  <p className="text-[11px] leading-snug text-gray-600 line-clamp-2">
                    {note.content || <span className="text-gray-400 italic">（空白便利貼）</span>}
                  </p>

                  {/* Footer: coordinates + comment count */}
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 font-mono truncate">
                      {note.lat.toFixed(4)}, {note.lng.toFixed(4)}
                    </span>
                    {commentCount > 0 && (
                      <span className="shrink-0 text-[10px] text-blue-500 font-semibold">
                        💬&nbsp;{commentCount}
                      </span>
                    )}
                  </div>
                </div>

                {/* Fly-to icon — visible on hover */}
                <div className="shrink-0 self-center opacity-0 group-hover:opacity-50 transition-opacity duration-100 text-gray-500">
                  <svg
                    className="w-3.5 h-3.5"
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
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
