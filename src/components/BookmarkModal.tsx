"use client";

import { useState } from "react";

interface BookmarkModalProps {
  lat: number;
  lng: number;
  onSave: (label: string) => void;
  onAddNote: () => void;
  onClose: () => void;
}

export default function BookmarkModal({
  lat,
  lng,
  onSave,
  onAddNote,
  onClose,
}: BookmarkModalProps) {
  const [label, setLabel] = useState("");

  const handleSave = () => {
    if (!label.trim()) return;
    onSave(label.trim());
  };

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">
              📍 Add Bookmark
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

          <div className="flex gap-2 mt-4">
            <button
              onClick={onAddNote}
              className="flex-1 px-4 py-2 text-sm text-yellow-700 bg-yellow-100 rounded-lg hover:bg-yellow-200 transition-colors font-medium"
            >
              📝 Add Note Instead
            </button>
            <button
              onClick={handleSave}
              disabled={!label.trim()}
              className="flex-1 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
            >
              Save Bookmark
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}