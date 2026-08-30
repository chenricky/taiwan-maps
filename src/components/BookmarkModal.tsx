"use client";

import { useState } from "react";

interface BookmarkModalProps {
  lat: number;
  lng: number;
  onSave: (label: string) => void;
  onAddNote: () => void;
  onSaveToday: (label: string, timeStart?: string, timeEnd?: string) => void;
  onClose: () => void;
}

export default function BookmarkModal({
  lat,
  lng,
  onSave,
  onAddNote,
  onSaveToday,
  onClose,
}: BookmarkModalProps) {
  const [label, setLabel] = useState("");
  // Progressive disclosure: clicking "Add as Today's Location" reveals the
  // optional time-window inputs inline instead of saving immediately.
  const [showTimeWindow, setShowTimeWindow] = useState(false);
  const [timeStart, setTimeStart] = useState("");
  const [timeEnd, setTimeEnd] = useState("");

  const handleSave = () => {
    if (!label.trim()) return;
    onSave(label.trim());
  };

  const handleSaveToday = () => {
    if (!label.trim()) return;
    onSaveToday(label.trim(), timeStart || undefined, timeEnd || undefined);
  };

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">
              📍 Add Location
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="text-xs text-gray-500 mb-3">
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </div>

          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Enter a name for this location..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            autoFocus
          />

          {!showTimeWindow ? (
            <div className="flex gap-2 mt-4">
              <button
                onClick={onAddNote}
                className="flex-1 min-h-[44px] px-2 py-2 text-xs sm:text-sm leading-tight text-yellow-700 bg-yellow-100 rounded-lg hover:bg-yellow-200 transition-colors font-medium"
              >
                📝 Add as Note
              </button>
              <button
                onClick={() => setShowTimeWindow(true)}
                disabled={!label.trim()}
                className="flex-1 min-h-[44px] px-2 py-2 text-xs sm:text-sm leading-tight text-emerald-700 bg-emerald-100 rounded-lg hover:bg-emerald-200 disabled:opacity-50 transition-colors font-medium"
              >
                📅 Add as Today&apos;s Location
              </button>
              <button
                onClick={handleSave}
                disabled={!label.trim()}
                className="flex-1 min-h-[44px] px-2 py-2 text-xs sm:text-sm leading-tight text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
              >
                Add as Bookmark
              </button>
            </div>
          ) : (
            <div className="mt-4">
              <label className="text-xs text-gray-500 block mb-2">
                Time window (optional) — roughly when you might be there
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={timeStart}
                  onChange={(e) => setTimeStart(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  aria-label="Start time"
                />
                <span className="text-gray-400 text-sm shrink-0">–</span>
                <input
                  type="time"
                  value={timeEnd}
                  onChange={(e) => setTimeEnd(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  aria-label="End time"
                />
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setShowTimeWindow(false)}
                  className="flex-1 min-h-[44px] px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  ‹ Back
                </button>
                <button
                  onClick={handleSaveToday}
                  className="flex-1 min-h-[44px] px-4 py-2 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                >
                  📅 Save Today&apos;s Location
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
