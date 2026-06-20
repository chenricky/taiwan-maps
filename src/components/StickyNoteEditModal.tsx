"use client";

import { useState } from "react";
import { StickyNote } from "@/types";

interface StickyNoteEditModalProps {
  note: StickyNote;
  onSave: (id: string, content: string, color: string) => void;
  onDelete: (id: string) => void;
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

export default function StickyNoteEditModal({
  note,
  onSave,
  onDelete,
  onClose,
}: StickyNoteEditModalProps) {
  const [content, setContent] = useState(note.content);
  const [color, setColor] = useState(note.color);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = () => {
    if (!content.trim()) return;
    onSave(note.id, content.trim(), color);
  };

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete(note.id);
    } else {
      setConfirmDelete(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">
              📝 編輯便利貼
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

          {/* Coordinates */}
          <div className="text-xs text-gray-400 mb-3">
            {note.lat.toFixed(5)}, {note.lng.toFixed(5)}
          </div>

          {/* Text area */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your note here..."
            rows={4}
            className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            autoFocus
            style={{ backgroundColor: color, borderColor: color }}
          />

          {/* Color picker */}
          <div className="mt-3">
            <label className="text-xs text-gray-500 block mb-2">
              便利貼顏色：
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

        {/* Action buttons */}
        <div className="flex gap-2 px-4 pb-4">
          {/* Delete button — requires double-tap to confirm */}
          <button
            onClick={handleDelete}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors min-h-[44px] ${
              confirmDelete
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
            }`}
            title={confirmDelete ? "再按一次確認刪除" : "刪除便利貼"}
          >
            {confirmDelete ? "確認刪除" : "🗑️ 刪除"}
          </button>

          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors min-h-[44px]"
          >
            取消
          </button>

          <button
            onClick={handleSave}
            disabled={!content.trim()}
            className="flex-1 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium min-h-[44px]"
          >
            儲存
          </button>
        </div>
      </div>
    </div>
  );
}
