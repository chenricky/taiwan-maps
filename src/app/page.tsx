"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { useSession, signIn, signOut } from "next-auth/react";
import { AppData, Bookmark, StickyNote, TodoItem, RoutePoint, TravelMode, SearchResult } from "@/types";
import SearchBar from "@/components/SearchBar";
import RoutingPanel from "@/components/RoutingPanel";
import BookmarksSidebar from "@/components/BookmarksSidebar";
import BookmarkModal from "@/components/BookmarkModal";
import StickyNoteModal from "@/components/StickyNoteModal";
import StickyNoteEditModal from "@/components/StickyNoteEditModal";
import TodoPanel from "@/components/TodoPanel";

const MapComponent = dynamic(() => import("@/components/MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-100">
      <div className="text-gray-500">Loading map...</div>
    </div>
  ),
});

// ── Layer toggle definition ────────────────────────────────────────────────────
interface LayerToggle {
  key: string;
  label: string;
  icon: string;
  activeColor: string;   // Tailwind bg class when ON
  activeBorder: string;  // Tailwind border class when ON
  activeText: string;    // Tailwind text class when ON
}

const LAYER_TOGGLES: LayerToggle[] = [
  {
    key: "tourist",
    label: "精選觀光景點",
    icon: "✨",
    activeColor: "bg-amber-500",
    activeBorder: "border-amber-600",
    activeText: "text-white",
  },
  {
    key: "facilities",
    label: "捷運出入口設施",
    icon: "♿",
    activeColor: "bg-blue-600",
    activeBorder: "border-blue-700",
    activeText: "text-white",
  },
  {
    key: "route",
    label: "捷運路網線",
    icon: "🚇",
    activeColor: "bg-indigo-600",
    activeBorder: "border-indigo-700",
    activeText: "text-white",
  },
  {
    key: "toilet",
    label: "夜市友善廁所",
    icon: "🚻",
    activeColor: "bg-green-600",
    activeBorder: "border-green-700",
    activeText: "text-white",
  },
  {
    key: "trail",
    label: "健走步道",
    icon: "🥾",
    activeColor: "bg-emerald-600",
    activeBorder: "border-emerald-700",
    activeText: "text-white",
  },
  {
    key: "bus",
    label: "出口公車轉乘",
    icon: "🚌",
    activeColor: "bg-orange-500",
    activeBorder: "border-orange-600",
    activeText: "text-white",
  },
  {
    key: "notes",
    label: "地圖便利貼",
    icon: "📝",
    activeColor: "bg-yellow-400",
    activeBorder: "border-yellow-500",
    activeText: "text-yellow-900",
  },
  {
    key: "heatmap",
    label: "地形坡度熱圖",
    icon: "🗺️",
    activeColor: "bg-rose-500",
    activeBorder: "border-rose-600",
    activeText: "text-white",
  },
];

export default function Home() {
  // ── Auth session ───────────────────────────────────────────────────────────
  const { data: session, status: sessionStatus } = useSession();
  const userEmail = session?.user?.email ?? null;
  const userName  = session?.user?.name  ?? null;

  const [appData, setAppData] = useState<AppData>({
    bookmarks: [],
    stickyNotes: [],
    todos: [],
    updatedAt: new Date().toISOString(),
  });

  const [loading, setLoading] = useState(true);

  // Layer visibility state
  const [showNotes, setShowNotes] = useState(true);
  const [showToiletLayer, setShowToiletLayer] = useState(false);
  const [showTrailLayer, setShowTrailLayer] = useState(false);
  const [showRouteLayer, setShowRouteLayer] = useState(false);
  const [showFacilitiesLayer, setShowFacilitiesLayer] = useState(false);
  const [showBusLayer, setShowBusLayer] = useState(false);
  const [showTouristLayer, setShowTouristLayer] = useState(false);
  const [showHeatmapLayer, setShowHeatmapLayer] = useState(false);

  // Panel collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  // Floating layer panel open/close (mobile: starts closed; desktop: starts open)
  const [layerPanelOpen, setLayerPanelOpen] = useState(true);

  // Click target for modals
  const [clickTarget, setClickTarget] = useState<{ lat: number; lng: number } | null>(null);
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);

  // Edit existing sticky note
  const [editingNote, setEditingNote] = useState<StickyNote | null>(null);

  // Routing state
  const [routeStart, setRouteStart] = useState<RoutePoint | null>(null);
  const [routeEnd, setRouteEnd] = useState<RoutePoint | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(null);
  const [routeDistance, setRouteDistance] = useState<string | undefined>();
  const [routeDuration, setRouteDuration] = useState<string | undefined>();

  // Search result
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);

  // Fly-to target
  const flyToKeyRef = useRef(0);
  const [flyToTarget, setFlyToTarget] = useState<{ bookmark: Bookmark; key: number } | null>(null);

  // Layer active map
  const layerActive: Record<string, boolean> = {
    tourist: showTouristLayer,
    facilities: showFacilitiesLayer,
    route: showRouteLayer,
    toilet: showToiletLayer,
    trail: showTrailLayer,
    bus: showBusLayer,
    notes: showNotes,
    heatmap: showHeatmapLayer,
  };

  const layerToggleHandlers: Record<string, () => void> = {
    tourist: () => setShowTouristLayer((v) => !v),
    facilities: () => setShowFacilitiesLayer((v) => !v),
    route: () => setShowRouteLayer((v) => !v),
    toilet: () => setShowToiletLayer((v) => !v),
    trail: () => setShowTrailLayer((v) => !v),
    bus: () => setShowBusLayer((v) => !v),
    notes: () => setShowNotes((v) => !v),
    heatmap: () => setShowHeatmapLayer((v) => !v),
  };

  // Reload data whenever the session changes (login / logout)
  useEffect(() => {
    if (sessionStatus === "loading") return; // wait for session to resolve
    const loadData = async () => {
      setLoading(true);
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
  }, [sessionStatus, userEmail]);

  // Save data
  const saveData = useCallback(async (newData: AppData) => {
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
  }, []);

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
      saveData({ ...appData, bookmarks: [...appData.bookmarks, newBookmark] });
      setShowBookmarkModal(false);
      setClickTarget(null);
    },
    [clickTarget, appData, saveData]
  );

  const handleDeleteBookmark = useCallback(
    (id: string) => {
      saveData({ ...appData, bookmarks: appData.bookmarks.filter((b) => b.id !== id) });
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
      saveData({ ...appData, stickyNotes: [...appData.stickyNotes, newNote] });
      setShowNoteModal(false);
      setClickTarget(null);
    },
    [clickTarget, appData, saveData]
  );

  // Edit existing note (opened by clicking a note on the map)
  const handleNoteClick = useCallback((note: StickyNote) => {
    setEditingNote(note);
  }, []);

  const handleUpdateNote = useCallback(
    (id: string, content: string, color: string) => {
      saveData({
        ...appData,
        stickyNotes: appData.stickyNotes.map((n) =>
          n.id === id ? { ...n, content, color } : n
        ),
      });
      setEditingNote(null);
    },
    [appData, saveData]
  );

  const handleDeleteNote = useCallback(
    (id: string) => {
      saveData({
        ...appData,
        stickyNotes: appData.stickyNotes.filter((n) => n.id !== id),
      });
      setEditingNote(null);
    },
    [appData, saveData]
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
      saveData({ ...appData, todos: [...appData.todos, newTodo] });
    },
    [appData, saveData]
  );

  const handleToggleTodo = useCallback(
    (id: string) => {
      saveData({
        ...appData,
        todos: appData.todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
      });
    },
    [appData, saveData]
  );

  const handleDeleteTodo = useCallback(
    (id: string) => {
      saveData({ ...appData, todos: appData.todos.filter((t) => t.id !== id) });
    },
    [appData, saveData]
  );

  const handleSetRouteStart = useCallback((bm: Bookmark) => {
    setRouteStart({ lat: bm.lat, lng: bm.lng });
  }, []);

  const handleSetRouteEnd = useCallback((bm: Bookmark) => {
    setRouteEnd({ lat: bm.lat, lng: bm.lng });
  }, []);

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

      {/* ── Header: logo + search + auth ────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 px-3 py-2 flex items-center gap-3 z-50 shrink-0">
        <h1 className="text-base font-bold text-blue-700 flex items-center gap-1.5 shrink-0">
          <span>🗺️</span>
          <span className="hidden sm:inline">Taiwan Maps</span>
        </h1>
        <div className="flex-1 min-w-0">
          <SearchBar onSearchResult={setSearchResult} />
        </div>

        {/* ── Auth: welcome badge + login/logout button ── */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Welcome badge — shown when logged in */}
          {session?.user && (
            <span className="hidden sm:inline-flex items-center gap-1 bg-green-50 border border-green-200 text-green-800 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">
              <span>👤</span>
              <span>{userName ?? userEmail} 您好</span>
            </span>
          )}

          {/* Login / Logout toggle button — min-h-[44px] for senior touch target */}
          {sessionStatus !== "loading" && (
            session
              ? (
                <button
                  onClick={() => signOut()}
                  className="min-h-[44px] px-3 py-1.5 rounded-lg border border-gray-300 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-700 text-sm font-semibold transition-colors whitespace-nowrap"
                  title="登出 Google 帳號"
                >
                  登出
                </button>
              )
              : (
                <button
                  onClick={() => signIn("google")}
                  className="min-h-[44px] px-3 py-1.5 rounded-lg border border-blue-400 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold transition-colors whitespace-nowrap shadow-sm"
                  title="使用 Google 帳號登入，儲存個人書籤與待辦事項"
                >
                  登入
                </button>
              )
          )}
        </div>
      </header>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* Left sidebar (desktop) */}
        <div
          className={`bg-white border-r border-gray-200 transition-all duration-300 flex flex-col shrink-0 overflow-hidden ${
            sidebarCollapsed ? "w-0 border-r-0" : "w-64 md:w-72"
          }`}
        >
          <div className="p-3 space-y-3 overflow-y-auto flex-1">
            {/* RoutingPanel hidden — UI disabled, code preserved */}
            <div className="hidden">
              <RoutingPanel
                onRoute={handleRoute}
                routeCoords={routeCoords}
                routeDistance={routeDistance}
                routeDuration={routeDuration}
              />
            </div>
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
            className={`w-4 h-4 text-gray-500 transition-transform ${sidebarCollapsed ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Map area */}
        <div className="flex-1 relative min-w-0">
          <MapComponent
            bookmarks={appData.bookmarks}
            stickyNotes={appData.stickyNotes}
            onMapClick={handleMapClick}
            onNoteClick={handleNoteClick}
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
            showHeatmapLayer={showHeatmapLayer}
            searchResult={searchResult}
            flyToTarget={flyToTarget}
          />

          {/* ── Floating Layer Control Panel ──────────────────────────────── */}
          {/*
            DESKTOP  (md+): top-left corner, vertical list, max-h scroll
            MOBILE   (<md): bottom sheet, 2-col grid, pinned above map edge
          */}

          {/* ── DESKTOP panel: top-left, vertical, scrollable ── */}
          <div className="hidden md:flex absolute top-3 left-3 z-[1000] flex-col gap-0 pointer-events-none">
            {/* Panel card */}
            <div
              className="pointer-events-auto bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 overflow-hidden"
              style={{ maxHeight: "85vh" }}
            >
              {/* Panel header / collapse toggle */}
              <button
                onClick={() => setLayerPanelOpen((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 border-b border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <span className="text-xs font-semibold text-gray-700 tracking-wide uppercase">
                  🗂️ 地圖圖層
                </span>
                <svg
                  className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${layerPanelOpen ? "" : "rotate-180"}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>

              {/* Toggle buttons — vertical list */}
              {layerPanelOpen && (
                <div className="overflow-y-auto pr-0.5" style={{ maxHeight: "calc(85vh - 44px)" }}>
                  <div className="flex flex-col gap-1 p-2">
                    {LAYER_TOGGLES.map((layer) => {
                      const isOn = layerActive[layer.key];
                      return (
                        <button
                          key={layer.key}
                          onClick={layerToggleHandlers[layer.key]}
                          title={`${isOn ? "隱藏" : "顯示"} ${layer.label}`}
                          className={`
                            flex items-center gap-2.5 w-full min-h-[44px] px-3 py-2
                            rounded-lg border font-medium text-sm
                            transition-all duration-150 text-left
                            ${isOn
                              ? `${layer.activeColor} ${layer.activeBorder} ${layer.activeText} shadow-sm`
                              : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300"
                            }
                          `}
                        >
                          <span className="text-base leading-none shrink-0">{layer.icon}</span>
                          <span className="leading-tight">
                            {isOn ? "隱藏" : "顯示"}{layer.label}
                          </span>
                          {/* Active indicator dot */}
                          {isOn && (
                            <span className="ml-auto w-2 h-2 rounded-full bg-white/70 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── MOBILE panel: bottom sheet, 2-col grid ── */}
          <div className="md:hidden absolute bottom-4 left-4 right-4 z-[1000] pointer-events-none">
            <div className="pointer-events-auto bg-white/97 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              {/* Mobile panel header */}
              <button
                onClick={() => setLayerPanelOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200 active:bg-gray-100"
              >
                <span className="text-sm font-semibold text-gray-700">
                  🗂️ 地圖圖層控制
                </span>
                <div className="flex items-center gap-2">
                  {/* Active layer count badge */}
                  {Object.values(layerActive).filter(Boolean).length > 0 && (
                    <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {Object.values(layerActive).filter(Boolean).length}
                    </span>
                  )}
                  <svg
                    className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${layerPanelOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </div>
              </button>

              {/* 2-column grid of toggle buttons */}
              {layerPanelOpen && (
                <div className="p-3">
                  <div className="grid grid-cols-2 gap-2">
                    {LAYER_TOGGLES.map((layer) => {
                      const isOn = layerActive[layer.key];
                      return (
                        <button
                          key={layer.key}
                          onClick={layerToggleHandlers[layer.key]}
                          className={`
                            flex items-center gap-2 min-h-[44px] w-full px-3 py-2.5
                            rounded-xl border font-medium text-sm
                            transition-all duration-150 text-left
                            ${isOn
                              ? `${layer.activeColor} ${layer.activeBorder} ${layer.activeText} shadow-sm`
                              : "bg-gray-50 border-gray-200 text-gray-600 active:bg-gray-100"
                            }
                          `}
                        >
                          <span className="text-base leading-none shrink-0">{layer.icon}</span>
                          <span className="text-xs leading-tight">
                            {isOn ? "隱藏" : "顯示"}<br />
                            <span className="font-semibold">{layer.label}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* ── End Floating Layer Control Panel ─────────────────────────── */}
        </div>

        {/* Right panel toggle */}
        <button
          onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
          className="bg-white border-l border-gray-200 px-1 hover:bg-gray-50 flex items-center z-10 shrink-0"
          title={rightPanelCollapsed ? "Show todos" : "Hide todos"}
        >
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${rightPanelCollapsed ? "rotate-180" : ""}`}
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
            rightPanelCollapsed ? "w-0 border-l-0" : "w-64 md:w-72"
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

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
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

      {/* Edit existing sticky note — opened by clicking a note on the map */}
      {editingNote && (
        <StickyNoteEditModal
          note={editingNote}
          onSave={handleUpdateNote}
          onDelete={handleDeleteNote}
          onClose={() => setEditingNote(null)}
        />
      )}

      {/* ── Status bar ──────────────────────────────────────────────────────── */}
      <footer className="bg-gray-100 border-t border-gray-200 px-4 py-1 text-xs text-gray-500 flex items-center justify-between shrink-0">
        <span className="truncate">
          📌 {appData.bookmarks.length} &nbsp;|&nbsp;
          📝 {appData.stickyNotes.length} &nbsp;|&nbsp;
          ✅ {appData.todos.length}
          {showTouristLayer && " | ✨ 景點 ON"}
          {showFacilitiesLayer && " | ♿ 設施 ON"}
          {showRouteLayer && " | 🚇 路網 ON"}
          {showToiletLayer && " | 🚻 廁所 ON"}
          {showTrailLayer && " | 🥾 步道 ON"}
          {showBusLayer && " | 🚌 公車 ON"}
          {showHeatmapLayer && " | 🗺️ 熱圖 ON"}
        </span>
        <span className="shrink-0 ml-2">OpenStreetMap &copy;</span>
      </footer>
    </div>
  );
}
