"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { AppData, Bookmark, StickyNote, TodoItem, RoutePoint, TravelMode, SearchResult } from "@/types";
import SearchBar from "@/components/SearchBar";
import RoutingPanel from "@/components/RoutingPanel";
import BookmarksSidebar from "@/components/BookmarksSidebar";
import BookmarkModal from "@/components/BookmarkModal";
import StickyNoteModal from "@/components/StickyNoteModal";
import TodoPanel from "@/components/TodoPanel";

const MapComponent = dynamic(() => import("@/components/MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-100">
      <div className="text-gray-500">Loading map...</div>
    </div>
  ),
});

export default function Home() {
  const [appData, setAppData] = useState<AppData>({
    bookmarks: [],
    stickyNotes: [],
    todos: [],
    updatedAt: new Date().toISOString(),
  });

  const [loading, setLoading] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
  const [showToiletLayer, setShowToiletLayer] = useState(false);
  const [showTrailLayer, setShowTrailLayer] = useState(false);
  const [showRouteLayer, setShowRouteLayer] = useState(false);
  const [showFacilitiesLayer, setShowFacilitiesLayer] = useState(false);
  const [showBusLayer, setShowBusLayer] = useState(false);
  const [showTouristLayer, setShowTouristLayer] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  // Click target for modals
  const [clickTarget, setClickTarget] = useState<{ lat: number; lng: number } | null>(null);
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);

  // Routing state
  const [routeStart, setRouteStart] = useState<RoutePoint | null>(null);
  const [routeEnd, setRouteEnd] = useState<RoutePoint | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(null);
  const [routeDistance, setRouteDistance] = useState<string | undefined>();
  const [routeDuration, setRouteDuration] = useState<string | undefined>();

  // Search result
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);

  // Fly-to target with incrementing key so clicking same bookmark always re-fires
  const flyToKeyRef = useRef(0);
  const [flyToTarget, setFlyToTarget] = useState<{ bookmark: Bookmark; key: number } | null>(null);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch("/api/storage");
        const data: AppData = await res.json();
        setAppData(data);
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Save data
  const saveData = useCallback(
    async (newData: AppData) => {
      setAppData(newData);
      try {
        await fetch("/api/storage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newData),
        });
      } catch (error) {
        console.error("Failed to save data:", error);
      }
    },
    []
  );

  // Map click handler
  const handleMapClick = useCallback((lat: number, lng: number) => {
    setClickTarget({ lat, lng });
    setShowBookmarkModal(true);
  }, []);

  // Bookmark handlers
  const handleSaveBookmark = useCallback(
    (label: string) => {
      if (!clickTarget) return;
      const newBookmark: Bookmark = {
        id: `bm-${Date.now()}`,
        lat: clickTarget.lat,
        lng: clickTarget.lng,
        label,
        createdAt: new Date().toISOString(),
      };
      const newData = {
        ...appData,
        bookmarks: [...appData.bookmarks, newBookmark],
      };
      saveData(newData);
      setShowBookmarkModal(false);
      setClickTarget(null);
    },
    [clickTarget, appData, saveData]
  );

  const handleDeleteBookmark = useCallback(
    (id: string) => {
      const newData = {
        ...appData,
        bookmarks: appData.bookmarks.filter((b) => b.id !== id),
      };
      saveData(newData);
    },
    [appData, saveData]
  );

  // Sticky note handlers
  const handleOpenNoteModal = useCallback(() => {
    setShowBookmarkModal(false);
    setShowNoteModal(true);
  }, []);

  const handleSaveNote = useCallback(
    (content: string, color: string) => {
      if (!clickTarget) return;
      const newNote: StickyNote = {
        id: `note-${Date.now()}`,
        lat: clickTarget.lat,
        lng: clickTarget.lng,
        content,
        color,
        createdAt: new Date().toISOString(),
      };
      const newData = {
        ...appData,
        stickyNotes: [...appData.stickyNotes, newNote],
      };
      saveData(newData);
      setShowNoteModal(false);
      setClickTarget(null);
    },
    [clickTarget, appData, saveData]
  );

  // Routing handler
  const handleRoute = useCallback(
    async (start: RoutePoint, end: RoutePoint, mode: TravelMode) => {
      setRouteStart(start);
      setRouteEnd(end);
      setRouteCoords(null);

      const modeMap: Record<string, string> = {
        driving: "driving",
        walking: "foot",
        cycling: "cycling",
      };

      try {
        const url = `https://router.project-osrm.org/route/v1/${modeMap[mode]}/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.code === "Ok" && data.routes.length > 0) {
          const route = data.routes[0];
          const coords = route.geometry.coordinates.map(
            (c: [number, number]) => [c[1], c[0]] as [number, number]
          );
          setRouteCoords(coords);
          setRouteDistance(`${(route.distance / 1000).toFixed(1)} km`);
          setRouteDuration(`${Math.round(route.duration / 60)} min`);
        }
      } catch (error) {
        console.error("Routing error:", error);
        alert("Could not calculate route. Please try again.");
      }
    },
    []
  );

  // Todo handlers
  const handleAddTodo = useCallback(
    (text: string, reminderDate?: string | null, reminderBookmarkId?: string | null) => {
      const newTodo: TodoItem = {
        id: `todo-${Date.now()}`,
        text,
        completed: false,
        reminderDate: reminderDate || null,
        reminderBookmarkId: reminderBookmarkId || null,
        createdAt: new Date().toISOString(),
      };
      const newData = {
        ...appData,
        todos: [...appData.todos, newTodo],
      };
      saveData(newData);
    },
    [appData, saveData]
  );

  const handleToggleTodo = useCallback(
    (id: string) => {
      const newData = {
        ...appData,
        todos: appData.todos.map((t) =>
          t.id === id ? { ...t, completed: !t.completed } : t
        ),
      };
      saveData(newData);
    },
    [appData, saveData]
  );

  const handleDeleteTodo = useCallback(
    (id: string) => {
      const newData = {
        ...appData,
        todos: appData.todos.filter((t) => t.id !== id),
      };
      saveData(newData);
    },
    [appData, saveData]
  );

  // Bookmark route shortcuts
  const handleSetRouteStart = useCallback((bm: Bookmark) => {
    setRouteStart({ lat: bm.lat, lng: bm.lng });
  }, []);

  const handleSetRouteEnd = useCallback((bm: Bookmark) => {
    setRouteEnd({ lat: bm.lat, lng: bm.lng });
  }, []);

  // Handle bookmark click to fly to location — works every time, even for the same bookmark
  const handleSelectBookmark = useCallback((bm: Bookmark) => {
    flyToKeyRef.current += 1;
    setFlyToTarget({ bookmark: bm, key: flyToKeyRef.current });
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <div className="text-gray-600 font-medium">Loading Taiwan Maps...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-2 flex flex-col gap-1.5 z-50 shrink-0">
        {/* Top row: logo + search */}
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-blue-700 flex items-center gap-2 shrink-0">
            <span>🗺️</span> Taiwan Maps
          </h1>
          <div className="flex-1 flex justify-center">
            <SearchBar onSearchResult={setSearchResult} />
          </div>
        </div>
        {/* Bottom row: layer toggles — wraps on narrow screens */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Tourist Spots Toggle — FIRST */}
          <button
            onClick={() => setShowTouristLayer(!showTouristLayer)}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all border whitespace-nowrap ${
              showTouristLayer
                ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                : "bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200"
            }`}
            title="顯示/隱藏精選觀光景點"
          >
            ✨ {showTouristLayer ? "隱藏" : "顯示"}精選觀光景點
          </button>

          {/* MRT Facilities Toggle */}
          <button
            onClick={() => setShowFacilitiesLayer(!showFacilitiesLayer)}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all border whitespace-nowrap ${
              showFacilitiesLayer
                ? "bg-blue-600 text-white border-blue-700 shadow-sm"
                : "bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200"
            }`}
            title="顯示/隱藏捷運出入口設施"
          >
            ♿ {showFacilitiesLayer ? "隱藏" : "顯示"}捷運出入口設施
          </button>

          {/* MRT Route Lines Toggle */}
          <button
            onClick={() => setShowRouteLayer(!showRouteLayer)}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all border whitespace-nowrap ${
              showRouteLayer
                ? "bg-indigo-600 text-white border-indigo-700 shadow-sm"
                : "bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200"
            }`}
            title="顯示/隱藏捷運路網線"
          >
            🚇 {showRouteLayer ? "隱藏" : "顯示"}捷運路網線
          </button>

          {/* Friendly Toilet Toggle */}
          <button
            onClick={() => setShowToiletLayer(!showToiletLayer)}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all border whitespace-nowrap ${
              showToiletLayer
                ? "bg-green-600 text-white border-green-700 shadow-sm"
                : "bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200"
            }`}
            title="顯示/隱藏夜市友善廁所"
          >
            🚻 {showToiletLayer ? "隱藏" : "顯示"}夜市友善廁所
          </button>

          {/* Walking Trail Toggle */}
          <button
            onClick={() => setShowTrailLayer(!showTrailLayer)}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all border whitespace-nowrap ${
              showTrailLayer
                ? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
                : "bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200"
            }`}
            title="顯示/隱藏健走步道"
          >
            🥾 {showTrailLayer ? "隱藏" : "顯示"}健走步道
          </button>

          {/* Bus Transfer Toggle */}
          <button
            onClick={() => setShowBusLayer(!showBusLayer)}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all border whitespace-nowrap ${
              showBusLayer
                ? "bg-orange-500 text-white border-orange-600 shadow-sm"
                : "bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200"
            }`}
            title="顯示/隱藏出口公車轉乘"
          >
            🚌 {showBusLayer ? "隱藏" : "顯示"}出口公車轉乘
          </button>

          {/* Notes Toggle */}
          <button
            onClick={() => setShowNotes(!showNotes)}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors border whitespace-nowrap ${
              showNotes
                ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                : "bg-gray-100 text-gray-500 border-gray-300"
            }`}
          >
            📝 {showNotes ? "Hide" : "Show"} Notes
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar */}
        <div
          className={`bg-white border-r border-gray-200 transition-all duration-300 flex flex-col shrink-0 overflow-hidden ${
            sidebarCollapsed ? "w-0 border-r-0" : "w-72"
          }`}
        >
          <div className="p-3 space-y-3 overflow-y-auto flex-1">
            <RoutingPanel
              onRoute={handleRoute}
              routeCoords={routeCoords}
              routeDistance={routeDistance}
              routeDuration={routeDuration}
            />
            <BookmarksSidebar
              bookmarks={appData.bookmarks}
              onDeleteBookmark={handleDeleteBookmark}
              onSelectBookmark={handleSelectBookmark}
              onSetRouteStart={handleSetRouteStart}
              onSetRouteEnd={handleSetRouteEnd}
            />
          </div>
        </div>

        {/* Sidebar toggle (left) */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="bg-white border-r border-gray-200 px-1 hover:bg-gray-50 flex items-center z-10 shrink-0"
          title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
        >
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${
              sidebarCollapsed ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Map area */}
        <div className="flex-1 relative">
          <MapComponent
            bookmarks={appData.bookmarks}
            stickyNotes={appData.stickyNotes}
            onMapClick={handleMapClick}
            routeStart={routeStart}
            routeEnd={routeEnd}
            routeCoords={routeCoords}
            showNotes={showNotes}
            showFacilitiesLayer={showFacilitiesLayer}
            showToiletLayer={showToiletLayer}
            showTrailLayer={showTrailLayer}
            showRouteLayer={showRouteLayer}
            showBusLayer={showBusLayer}
            showTouristLayer={showTouristLayer}
            searchResult={searchResult}
            flyToTarget={flyToTarget}
          />
        </div>

        {/* Right panel toggle */}
        <button
          onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
          className="bg-white border-l border-gray-200 px-1 hover:bg-gray-50 flex items-center z-10 shrink-0"
          title={rightPanelCollapsed ? "Show todos" : "Hide todos"}
        >
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${
              rightPanelCollapsed ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Right todo panel */}
        <div
          className={`bg-white border-l border-gray-200 transition-all duration-300 flex flex-col shrink-0 overflow-hidden ${
            rightPanelCollapsed ? "w-0 border-l-0" : "w-72"
          }`}
        >
          <div className="p-3 overflow-y-auto flex-1">
            <TodoPanel
              todos={appData.todos}
              bookmarks={appData.bookmarks}
              onAddTodo={handleAddTodo}
              onToggleTodo={handleToggleTodo}
              onDeleteTodo={handleDeleteTodo}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      {showBookmarkModal && clickTarget && (
        <BookmarkModal
          lat={clickTarget.lat}
          lng={clickTarget.lng}
          onSave={handleSaveBookmark}
          onAddNote={handleOpenNoteModal}
          onClose={() => {
            setShowBookmarkModal(false);
            setClickTarget(null);
          }}
        />
      )}

      {showNoteModal && clickTarget && (
        <StickyNoteModal
          lat={clickTarget.lat}
          lng={clickTarget.lng}
          onSave={handleSaveNote}
          onClose={() => {
            setShowNoteModal(false);
            setClickTarget(null);
          }}
        />
      )}

      {/* Status bar */}
      <footer className="bg-gray-100 border-t border-gray-200 px-4 py-1 text-xs text-gray-500 flex items-center justify-between shrink-0">
        <span>
          Bookmarks: {appData.bookmarks.length} | Notes: {appData.stickyNotes.length} | Todos: {appData.todos.length}
          {showFacilitiesLayer && " | ♿ 出入口設施 ON"}
          {showRouteLayer && " | 🚇 路網線 ON"}
          {showToiletLayer && " | 🚻 友善廁所 ON"}
        </span>
        <span>OpenStreetMap &copy; contributors</span>
      </footer>
    </div>
  );
}
