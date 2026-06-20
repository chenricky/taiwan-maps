"use client";

import { useState } from "react";
import { TodoItem, Bookmark } from "@/types";

interface TodoPanelProps {
  todos: TodoItem[];
  bookmarks: Bookmark[];
  onAddTodo: (text: string, reminderDate?: string | null, reminderBookmarkId?: string | null) => void;
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
}

export default function TodoPanel({
  todos,
  bookmarks,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
}: TodoPanelProps) {
  const [newTodoText, setNewTodoText] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [reminderDate, setReminderDate] = useState("");
  const [reminderBookmarkId, setReminderBookmarkId] = useState("");

  const handleAdd = () => {
    if (!newTodoText.trim()) return;
    onAddTodo(
      newTodoText.trim(),
      reminderDate || null,
      reminderBookmarkId || null
    );
    setNewTodoText("");
    setReminderDate("");
    setReminderBookmarkId("");
    setShowAddForm(false);
  };

  const activeTodos = todos.filter((t) => !t.completed);
  const completedTodos = todos.filter((t) => t.completed);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <span>✅</span> Todos ({activeTodos.length})
        </h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          title="Add Todo"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {showAddForm && (
        <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <input
            type="text"
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            placeholder="What needs to be done?"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mb-2"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />

          <input
            type="datetime-local"
            value={reminderDate}
            onChange={(e) => setReminderDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mb-2"
          />

          {bookmarks.length > 0 && (
            <select
              value={reminderBookmarkId}
              onChange={(e) => setReminderBookmarkId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mb-2"
            >
              <option value="">No bookmark linked</option>
              {bookmarks.map((bm) => (
                <option key={bm.id} value={bm.id}>
                  {bm.label}
                </option>
              ))}
            </select>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setShowAddForm(false)}
              className="flex-1 px-3 py-1.5 text-sm text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!newTodoText.trim()}
              className="flex-1 px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2">
        {/* Active todos */}
        {activeTodos.map((todo) => (
          <div
            key={todo.id}
            className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 group transition-colors"
          >
            <button
              onClick={() => onToggleTodo(todo.id)}
              className="mt-0.5 w-5 h-5 rounded-full border-2 border-gray-300 hover:border-blue-500 flex-shrink-0 flex items-center justify-center transition-colors"
            >
              {todo.completed && (
                <div className="w-3 h-3 rounded-full bg-blue-600" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-800">{todo.text}</div>
              <div className="flex flex-wrap gap-2 mt-1">
                {todo.createdBy?.name && (
                  <span className="text-xs text-gray-400">
                    👤 {todo.createdBy.name}
                  </span>
                )}
                {todo.reminderDate && (
                  <span className="text-xs text-blue-500">
                    🕐 {new Date(todo.reminderDate).toLocaleString()}
                  </span>
                )}
                {todo.reminderBookmarkId && (
                  <span className="text-xs text-green-500">📍 Linked</span>
                )}
              </div>
            </div>
            <button
              onClick={() => onDeleteTodo(todo.id)}
              className="p-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {/* Completed todos */}
        {completedTodos.length > 0 && (
          <>
            <div className="border-t border-gray-200 pt-2 mt-2">
              <div className="text-xs text-gray-400 mb-1">
                Completed ({completedTodos.length})
              </div>
            </div>
            {completedTodos.map((todo) => (
              <div
                key={todo.id}
                className="flex items-start gap-2 p-2 rounded-lg opacity-60"
              >
                <button
                  onClick={() => onToggleTodo(todo.id)}
                  className="mt-0.5 w-5 h-5 rounded-full border-2 border-green-400 bg-green-100 flex-shrink-0 flex items-center justify-center"
                >
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-500 line-through">
                    {todo.text}
                  </div>
                </div>
                <button
                  onClick={() => onDeleteTodo(todo.id)}
                  className="p-1 text-red-400 hover:text-red-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </>
        )}

        {todos.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-8">
            No todos yet. Click + to add one.
          </p>
        )}
      </div>
    </div>
  );
}