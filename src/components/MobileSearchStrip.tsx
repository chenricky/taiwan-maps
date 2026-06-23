"use client";

import SearchBar from "@/components/SearchBar";
import { SearchResult } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SearchConfig {
  onSearchResult:    (r: SearchResult | null) => void;
  sessionStatus:     string;
  isLoggedIn:        boolean;
  userName:          string | null;
  userEmail:         string | null;
  isAdmin:           boolean;
  mobileMenuOpen:    boolean;
  onMobileMenuOpen:  (v: boolean) => void;
  onSignIn:          () => void;
  onSignOut:         () => void;
  onShowInviteModal: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MobileSearchStrip({
  onSearchResult,
  sessionStatus,
  isLoggedIn,
  userName,
  userEmail,
  isAdmin,
  mobileMenuOpen,
  onMobileMenuOpen,
  onSignIn,
  onSignOut,
  onShowInviteModal,
}: SearchConfig) {
  const displayInitial =
    isLoggedIn ? (userName ?? userEmail ?? "?")[0]?.toUpperCase() : null;

  return (
    <div className="shrink-0 flex items-center gap-2 px-3 py-2.5 border-b border-white/20">
      {/* Search bar — dropdown opens upward because strip is at screen bottom */}
      <div className="flex-1 min-w-0">
        <SearchBar onSearchResult={onSearchResult} dropUp />
      </div>

      {/* Auth FAB */}
      <div className="relative shrink-0">
        <button
          onClick={() => onMobileMenuOpen(!mobileMenuOpen)}
          className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                     text-white font-bold text-sm flex items-center justify-center
                     shadow-md transition-colors"
          aria-label="選單"
          aria-expanded={mobileMenuOpen}
        >
          {displayInitial ?? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}
              viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>

        {mobileMenuOpen && (
          <>
            {/* Tap-away dismiss */}
            <div className="fixed inset-0 z-[3000]" onClick={() => onMobileMenuOpen(false)} />
            {/* Dropdown — opens upward */}
            <div className="absolute bottom-full right-0 mb-2 w-44 bg-white rounded-xl
                            shadow-xl border border-gray-100 py-1.5 z-[3001]">
              {isLoggedIn && (
                <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100 truncate font-medium">
                  {userName ?? userEmail}
                </div>
              )}
              {isAdmin && (
                <button
                  onClick={() => { onShowInviteModal(); onMobileMenuOpen(false); }}
                  className="w-full text-left px-3 py-2.5 text-sm text-purple-700 font-semibold
                             hover:bg-purple-50 active:bg-purple-100 flex items-center gap-2 transition-colors"
                >
                  <span>⚙️</span><span>成員管理</span>
                </button>
              )}
              {sessionStatus !== "loading" && (
                isLoggedIn ? (
                  <button
                    onClick={() => { onSignOut(); onMobileMenuOpen(false); }}
                    className="w-full text-left px-3 py-2.5 text-sm text-gray-700
                               hover:bg-gray-50 active:bg-gray-100 flex items-center gap-2 transition-colors"
                  >
                    <span>👋</span><span>登出</span>
                  </button>
                ) : (
                  <button
                    onClick={() => { onSignIn(); onMobileMenuOpen(false); }}
                    className="w-full text-left px-3 py-2.5 text-sm text-blue-700 font-semibold
                               hover:bg-blue-50 active:bg-blue-100 flex items-center gap-2 transition-colors"
                  >
                    <span>🔑</span><span>Google 登入</span>
                  </button>
                )
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
