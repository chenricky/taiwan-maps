"use client";

import { useState } from "react";

interface StickyNoteModalProps {
  lat: number;
  lng: number;
  onSave: (content: string, color: string) => void;
  onClose: () => void;
}

const NOTE_COLORS = [
  { name: "Yellow", value: "#fef68a" },
  { name: "Green", value: "#b5e7a0" },
  { name: "Blue", value: "#a0d8ef" },
  { name: "Pink", value: "#f9c6d9" },
  { name: "Orange", value: "#fcd9a0" },
  { name: "Purple", value: "#d4b8e8" },
];

export default function StickyNoteModal({
  lat,
  lng,
  onSave,
  onClose,
}: StickyNoteModalProps) {
  const [content, setContent] = useState("");
  const [color, setColor] = useState(NOTE_COLORS[0].value);

  const handleSave = () => {
    if (!content.trim()) return;
    onSave(content.trim(), color);
  };

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">
              📝 Add Sticky Note
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="text-xs text-gray-500 mb-3">
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your note here..."
            rows={4}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            autoFocus
            style={{ backgroundColor: color, borderColor: color }}
          />

          <div className="mt-3">
            <label className="text-xs text-gray-500 block mb-2">
              Choose note color:
            </label>
            <div className="flex gap-2">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    color === c.value
                      ? "border-blue-600 scale-110"
                      : "border-gray-300 hover:scale-105"
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 px-4 pb-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!content.trim()}
            className="flex-1 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
          >
            Save Note
          </button>
        </div>
      </div>
    </div>
  );
}