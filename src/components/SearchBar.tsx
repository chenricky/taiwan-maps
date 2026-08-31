"use client";

import { useState, useCallback } from "react";
import { SearchResult } from "@/types";

interface SearchBarProps {
  onSearchResult: (result: SearchResult) => void;
  /** When true the results dropdown opens upward — use when mounted at the screen bottom */
  dropUp?: boolean;
}

function SearchIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
    </svg>
  );
}

export default function SearchBar({ onSearchResult, dropUp = false }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const searchLocations = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          q
        )}&limit=5&countrycodes=tw`
      );
      const data: SearchResult[] = await res.json();
      setResults(data);
      setShowDropdown(data.length > 0);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSelect = (result: SearchResult) => {
    setQuery(result.display_name);
    setShowDropdown(false);
    onSearchResult(result);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      searchLocations(query);
    }
  };

  return (
    <div className="relative w-full max-w-md">
      {/* Single unified control: input + button share one rounded shape and border,
          so the search action reads as one component instead of two. */}
      <div className="flex items-center h-10 rounded-lg border border-gray-300 bg-white shadow-sm overflow-hidden
                       focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-colors">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search locations in Taiwan..."
          className="flex-1 min-w-0 h-full pl-3.5 pr-2 text-sm outline-none bg-transparent placeholder:text-gray-400"
        />
        <button
          onClick={() => searchLocations(query)}
          disabled={isLoading}
          aria-label="Search"
          className="h-full shrink-0 px-4 inline-flex items-center gap-1.5 bg-blue-600 text-white text-sm font-medium
                     hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 transition-colors
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
        >
          {isLoading ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <SearchIcon />
          )}
          <span className="hidden sm:inline">Search</span>
        </button>
      </div>

      {showDropdown && (
        <div className={`absolute ${dropUp ? "bottom-full mb-1" : "top-full mt-1"} left-0 right-0 bg-white rounded-lg shadow-xl border border-gray-200 z-[2000] max-h-60 overflow-y-auto`}>
          {results.map((r) => (
            <button
              key={r.place_id}
              onClick={() => handleSelect(r)}
              className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="text-sm text-gray-800 line-clamp-2">
                {r.display_name}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
