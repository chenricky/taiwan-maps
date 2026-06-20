"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { StickyNote, NoteComment } from "@/types";

interface StickyNoteEditModalProps {
  note: StickyNote;
  onSave:   (id: string, content: string, color: string) => void;
  onDelete: (id: string) => void;
  onClose:  () => void;
}

const NOTE_COLORS = [
  { name: "Yellow", value: "#fef68a" },
  { name: "Green",  value: "#b5e7a0" },
  { name: "Blue",   value: "#a0d8ef" },
  { name: "Pink",   value: "#f9c6d9" },
  { name: "Orange", value: "#fcd9a0" },
  { name: "Purple", value: "#d4b8e8" },
];

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return "剛剛";
  if (diff < 3600) return `${Math.floor(diff / 60)} 分鐘前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小時前`;
  return `${Math.floor(diff / 86400)} 天前`;
}

export default function StickyNoteEditModal({
  note,
  onSave,
  onDelete,
  onClose,
}: StickyNoteEditModalProps) {
  const { data: session, status: sessionStatus } = useSession();
  const userEmail = session?.user?.email ?? null;
  const userName  = session?.user?.name  ?? null;
  const sessionLoading = sessionStatus === "loading";

  // ── Edit mode state ────────────────────────────────────────────────────
  const [editing, setEditing]   = useState(false);
  const [content, setContent]   = useState(note.content);
  const [color,   setColor]     = useState(note.color);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // ── Comment state ──────────────────────────────────────────────────────
  const [comments, setComments]     = useState<NoteComment[]>(note.comments ?? []);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  // Scroll thread to bottom when new comment arrives
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [comments.length]);

  const isNoteAuthor = userEmail && note.createdBy?.email === userEmail;

  // ── Save edited note ───────────────────────────────────────────────────
  const handleSave = () => {
    if (!content.trim()) return;
    onSave(note.id, content.trim(), color);
    setEditing(false);
  };

  // ── Delete whole note ──────────────────────────────────────────────────
  const handleDeleteNote = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    onDelete(note.id);
  };

  // ── Submit comment ─────────────────────────────────────────────────────
  const handleSubmitComment = async () => {
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    setCommentError(null);

    // Optimistic update
    const optimistic: NoteComment = {
      id:        `cmt-optimistic-${Date.now()}`,
      text:      commentText.trim(),
      createdAt: new Date().toISOString(),
      createdBy: { name: userName ?? userEmail ?? "我", email: userEmail ?? "" },
    };
    setComments((prev) => [...prev, optimistic]);
    setCommentText("");

    try {
      const res = await fetch("/api/notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId: note.id, text: optimistic.text }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        // Roll back optimistic update
        setComments((prev) => prev.filter((c) => c.id !== optimistic.id));
        setCommentError(json.error ?? "留言失敗，請再試一次");
      } else {
        // Replace optimistic entry with server-confirmed comment
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

  // ── Delete a single comment ────────────────────────────────────────────
  const handleDeleteComment = async (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    try {
      await fetch("/api/notes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId: note.id, commentId }),
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
          <h3 className="text-sm font-bold text-gray-700">📝 便利貼討論串</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Original Post Card ───────────────────────────────────────── */}
        <div className="px-4 pt-3 pb-2 shrink-0">
          {editing ? (
            <>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                style={{ backgroundColor: color, borderColor: color }}
                autoFocus
              />
              <div className="flex gap-1.5 mt-2">
                {NOTE_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setColor(c.value)}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${
                      color === c.value ? "border-blue-600 scale-110" : "border-gray-300"
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setEditing(false)}
                  className="flex-1 py-1.5 text-xs text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                >取消</button>
                <button
                  onClick={handleSave}
                  disabled={!content.trim()}
                  className="flex-1 py-1.5 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                >儲存</button>
              </div>
            </>
          ) : (
            <div
              className="rounded-xl p-3 relative"
              style={{ backgroundColor: note.color }}
            >
              <p className="text-sm font-medium text-gray-800 whitespace-pre-wrap leading-relaxed">
                {note.content}
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500">
                  ✍️ {note.createdBy?.name ?? "匿名"} · {timeAgo(note.createdAt)}
                </span>
                <div className="flex gap-1">
                  {/* Edit — only note author */}
                  {isNoteAuthor && (
                    <button
                      onClick={() => setEditing(true)}
                      className="text-xs text-gray-500 hover:text-blue-600 px-2 py-0.5 rounded hover:bg-white/50 transition-colors"
                    >✏️ 編輯</button>
                  )}
                  {/* Delete whole note — only note author */}
                  {isNoteAuthor && (
                    <button
                      onClick={handleDeleteNote}
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
          )}
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
                  {/* Avatar */}
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 shrink-0 mt-0.5">
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
            /* Session still resolving — show a neutral placeholder so the UI
               doesn't flash between "logged in" and "logged out" states */
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
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none resize-none"
                />
                <button
                  onClick={handleSubmitComment}
                  disabled={!commentText.trim() || submitting}
                  className="min-h-[44px] px-4 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0"
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
