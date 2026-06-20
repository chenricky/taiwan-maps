"use client";

import { signIn } from "next-auth/react";

/**
 * Friendly access-denied page shown when a non-whitelisted Google account
 * attempts to sign in. NextAuth redirects here when signIn() returns a URL
 * string instead of true/false.
 */
export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
        {/* Icon */}
        <div className="text-5xl mb-4">🔒</div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-800 mb-2">存取遭拒</h1>
        <p className="text-gray-500 text-sm mb-6">
          您的 Google 帳號尚未獲得授權使用此應用程式。
          <br />
          請聯絡管理員取得邀請。
        </p>

        {/* Info box */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
          <p className="text-amber-800 text-xs font-semibold mb-1">📋 如何取得存取權限？</p>
          <p className="text-amber-700 text-xs">
            請聯絡系統管理員，提供您的 Google 帳號 Email，
            待管理員將您加入白名單後即可登入。
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => signIn("google")}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
          >
            使用其他帳號登入
          </button>
          <a
            href="/"
            className="w-full py-2.5 px-4 rounded-xl border border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold text-sm transition-colors block"
          >
            返回首頁（訪客模式）
          </a>
        </div>
      </div>
    </div>
  );
}
