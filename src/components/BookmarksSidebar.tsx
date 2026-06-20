"use client";

import { Bookmark } from "@/types";

interface BookmarksSidebarProps {
  bookmarks: Bookmark[];
  onDeleteBookmark: (id: string) => void;
  onSelectBookmark?: (bookmark: Bookmark) => void;
  onSetRouteStart?: (bookmark: Bookmark) => void;
  onSetRouteEnd?: (bookmark: Bookmark) => void;
}

export default function BookmarksSidebar({
  bookmarks,
  onDeleteBookmark,
  onSelectBookmark,
  onSetRouteStart,
  onSetRouteEnd,
}: BookmarksSidebarProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <span>🔖</span> Bookmarks ({bookmarks.length})
      </h3>

      {bookmarks.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">
          No bookmarks yet. Click on the map to add one.
        </p>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {bookmarks.map((bm) => (
            <div
              key={bm.id}
              className="flex items-start gap-2 p-2 rounded-md hover:bg-gray-50 group transition-colors"
            >
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => onSelectBookmark?.(bm)}
                  className="text-sm font-medium text-gray-800 truncate block w-full text-left hover:text-blue-600"
                >
                  {bm.label}
                </button>
                <div className="text-xs text-gray-400">
                  {bm.lat.toFixed(4)}, {bm.lng.toFixed(4)}
                </div>
                {bm.createdBy?.name && (
                  <div className="text-xs text-gray-400 mt-0.5">
                    👤 {bm.createdBy.name}
                  </div>
                )}
              </div>

              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {onSetRouteStart && (
                  <button
                    onClick={() => onSetRouteStart(bm)}
                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                    title="Set as route start"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </button>
                )}
                {onSetRouteEnd && (
                  <button
                    onClick={() => onSetRouteEnd(bm)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                    title="Set as route end"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => onDeleteBookmark(bm.id)}
                  className="p-1 text-red-500 hover:bg-red-50 rounded"
                  title="Delete bookmark"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}