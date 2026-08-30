"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { TodayLocation, NoteComment } from "@/types";

interface TodayLocationEditModalProps {
  location: TodayLocation;
  onDelete: (id: string) => void;
  onClose:  () => void;
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return "剛剛";
  if (diff < 3600) return `${Math.floor(diff / 60)} 分鐘前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小時前`;
  return `${Math.floor(diff / 86400)} 天前`;
}

// "14:00" -> "2:00 PM"
function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

export default function TodayLocationEditModal({
  location,
  onDelete,
  onClose,
}: TodayLocationEditModalProps) {
  const { data: session, status: sessionStatus } = useSession();
  const userEmail = session?.user?.email ?? null;
  const userName  = session?.user?.name  ?? null;
  const sessionLoading = sessionStatus === "loading";

  const [confirmDelete, setConfirmDelete] = useState(false);

  // ── Comment state ──────────────────────────────────────────────────────
  const [comments, setComments]     = useState<NoteComment[]>(location.comments ?? []);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [comments.length]);

  const isAuthor = userEmail && location.createdBy?.email === userEmail;
  const timeWindow = location.timeStart
    ? `${formatTime(location.timeStart)}${location.timeEnd ? ` – ${formatTime(location.timeEnd)}` : ""}`
    : null;

  const handleDeleteLocation = () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    onDelete(location.id);
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    setCommentError(null);

    const optimistic: NoteComment = {
      id:        `cmt-optimistic-${Date.now()}`,
      text:      commentText.trim(),
      createdAt: new Date().toISOString(),
      createdBy: { name: userName ?? userEmail ?? "我", email: userEmail ?? "" },
    };
    setComments((prev) => [...prev, optimistic]);
    setCommentText("");

    try {
      const res = await fetch("/api/today-locations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId: location.id, text: optimistic.text }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setComments((prev) => prev.filter((c) => c.id !== optimistic.id));
        setCommentError(json.error ?? "留言失敗，請再試一次");
      } else {
        setComments((prev) =>
          prev.map((c) => (c.id === optimistic.id ? json.comment : c))
        );
      }
    } catch {
      setComments((prev) => prev.filter((c) => c.id !== optimistic.id));
      setCommentError("網路錯誤，請再試一次");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    try {
      await fetch("/api/today-locations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId: location.id, commentId }),
      });
    } catch {
      // Silent fail — comment already removed from UI
    }
  };

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden max-h-[90vh]">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
          <h3 className="text-sm font-bold text-gray-700">📅 今日行程討論串</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Location Card ─────────────────────────────────────────────── */}
        <div className="px-4 pt-3 pb-2 shrink-0">
          <div className="rounded-xl p-3 bg-emerald-50 border border-emerald-100 relative">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-gray-800">{location.label}</p>
              {timeWindow && (
                <span className="shrink-0 text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                  🕐 {timeWindow}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 font-mono mt-1">
              {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
            </p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-500">
                ✍️ {location.createdBy?.name ?? "匿名"} · {timeAgo(location.createdAt)}
              </span>
              {isAuthor && (
                <button
                  onClick={handleDeleteLocation}
                  className={`text-xs px-2 py-0.5 rounded transition-colors ${
                    confirmDelete
                      ? "bg-red-600 text-white"
                      : "text-red-500 hover:bg-white/50"
                  }`}
                >
                  {confirmDelete ? "確認刪除" : "🗑️"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Comment Thread (scrollable) ──────────────────────────────── */}
        <div
          ref={threadRef}
          className="flex-1 overflow-y-auto px-4 py-2 space-y-2 min-h-0"
        >
          {comments.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">
              還沒有留言，成為第一個留言的人！
            </p>
          ) : (
            comments.map((cmt) => {
              const isMine = userEmail && cmt.createdBy.email === userEmail;
              return (
                <div key={cmt.id} className="flex gap-2 group">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700 shrink-0 mt-0.5">
                    {(cmt.createdBy.name || cmt.createdBy.email)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="bg-gray-50 rounded-xl px-3 py-2">
                      <span className="text-xs font-semibold text-gray-700">
                        {cmt.createdBy.name || cmt.createdBy.email}
                      </span>
                      <p className="text-sm text-gray-800 mt-0.5 whitespace-pre-wrap">{cmt.text}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 px-1">
                      <span className="text-xs text-gray-400">{timeAgo(cmt.createdAt)}</span>
                      {isMine && (
                        <button
                          onClick={() => handleDeleteComment(cmt.id)}
                          className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >刪除</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Comment Input ────────────────────────────────────────────── */}
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 shrink-0">
          {sessionLoading ? (
            <p className="text-xs text-gray-400 text-center py-2 animate-pulse">
              載入中…
            </p>
          ) : userEmail ? (
            <>
              {commentError && (
                <p className="text-xs text-red-500 mb-1">{commentError}</p>
              )}
              <div className="flex gap-2">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmitComment();
                    }
                  }}
                  placeholder="留下你的留言…"
                  rows={2}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none resize-none"
                />
                <button
                  onClick={handleSubmitComment}
                  disabled={!commentText.trim() || submitting}
                  className="min-h-[44px] px-4 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors shrink-0"
                >
                  {submitting ? "…" : "發表"}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Enter 送出 · Shift+Enter 換行</p>
            </>
          ) : (
            <p className="text-xs text-gray-500 text-center py-2">
              請先 <span className="text-blue-600 font-semibold">登入</span> 才能留言
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
