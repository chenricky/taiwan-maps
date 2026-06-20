"use client";

import { useState } from "react";

interface InviteManagerModalProps {
  invitedUsers: string[];
  onClose: () => void;
  /** Called after a successful add/remove so the parent can re-fetch appData */
  onRefresh: () => void;
}

const ADMIN_EMAIL = "chenricky@gmail.com";

export default function InviteManagerModal({
  invitedUsers,
  onClose,
  onRefresh,
}: InviteManagerModalProps) {
  const [newEmail, setNewEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const clearMessages = () => { setError(null); setSuccess(null); };

  // ── Add ──────────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      setError("請輸入有效的 Email 地址");
      return;
    }
    clearMessages();
    setBusy(true);
    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "新增失敗，請稍後再試");
      } else {
        setSuccess(`✅ 已成功邀請 ${email}`);
        setNewEmail("");
        onRefresh();
      }
    } catch (err) {
      setError(`網路錯誤：${String(err)}`);
    } finally {
      setBusy(false);
    }
  };

  // ── Remove ────────────────────────────────────────────────────────────────
  const handleRemove = async (email: string) => {
    if (email.toLowerCase() === ADMIN_EMAIL) return; // guard
    clearMessages();
    setBusy(true);
    try {
      const res = await fetch("/api/invite", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "移除失敗，請稍後再試");
      } else {
        setSuccess(`🗑️ 已移除 ${email}`);
        onRefresh();
      }
    } catch (err) {
      setError(`網路錯誤：${String(err)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <span>⚙️</span>
            <span>成員管理</span>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
            aria-label="關閉"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">

          {/* Add new member */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              新增邀請成員
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
                placeholder="輸入 Google Email 地址"
                disabled={busy}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              />
              <button
                onClick={handleAdd}
                disabled={busy || !newEmail.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
              >
                {busy ? "處理中…" : "新增邀請"}
              </button>
            </div>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">
              ⚠️ {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-xs rounded-lg px-3 py-2">
              {success}
            </div>
          )}

          {/* Current whitelist */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">
              目前白名單成員（{invitedUsers.length} 人）
            </p>
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {invitedUsers.length === 0 ? (
                <p className="text-xs text-gray-400 italic">尚無成員</p>
              ) : (
                invitedUsers.map((email) => {
                  const isAdmin = email.toLowerCase() === ADMIN_EMAIL;
                  return (
                    <div
                      key={email}
                      className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm">{isAdmin ? "👑" : "👤"}</span>
                        <span className="text-xs text-gray-700 truncate">{email}</span>
                        {isAdmin && (
                          <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full font-semibold shrink-0">
                            管理員
                          </span>
                        )}
                      </div>
                      {!isAdmin && (
                        <button
                          onClick={() => handleRemove(email)}
                          disabled={busy}
                          className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40 font-semibold shrink-0 transition-colors"
                          title={`移除 ${email}`}
                        >
                          移除
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}
