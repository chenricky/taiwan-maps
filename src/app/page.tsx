"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { useSession, signIn, signOut } from "next-auth/react";
import { Map as MapIcon, Settings, LogOut, LogIn, Bookmark as BookmarkIcon, StickyNote as StickyNoteIcon, CheckSquare } from "lucide-react";
import { Bookmark, StickyNote, TodayLocation, TodoItem, RoutePoint, TravelMode, SearchResult } from "@/types";
import SearchBar from "@/components/SearchBar";
import RoutingPanel from "@/components/RoutingPanel";
import BookmarkModal from "@/components/BookmarkModal";
import StickyNoteModal from "@/components/StickyNoteModal";
import StickyNoteEditModal from "@/components/StickyNoteEditModal";
import TodayLocationEditModal from "@/components/TodayLocationEditModal";
import TodoPanel from "@/components/TodoPanel";
import InviteManagerModal from "@/components/InviteManagerModal";
import MapControlPanel from "@/components/MapControlPanel";
import MobileBottomSheet from "@/components/MobileBottomSheet";
import { useAppData } from "@/hooks/useAppData";

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

// Subtle-tint pill classes for the footer's active-layer flags, keyed by LAYER_TOGGLES.key.
// Written as full literal class strings (not template-interpolated) so Tailwind's static
// scanner can actually find and generate them at build time.
const LAYER_PILL_CLASS: Record<string, string> = {
  tourist:    "bg-amber-50 text-amber-700",
  facilities: "bg-blue-50 text-blue-700",
  route:      "bg-indigo-50 text-indigo-700",
  toilet:     "bg-green-50 text-green-700",
  trail:      "bg-emerald-50 text-emerald-700",
  bus:        "bg-orange-50 text-orange-700",
  notes:      "bg-yellow-50 text-yellow-700",
  heatmap:    "bg-rose-50 text-rose-700",
};

export default function Home() {
  // ── Auth session ───────────────────────────────────────────────────────────
  const { data: session, status: sessionStatus } = useSession();
  const userEmail = session?.user?.email ?? null;
  const userName  = session?.user?.name  ?? null;

  const { appData, isLoading, saveData, refreshData } = useAppData(sessionStatus !== "loading", userEmail);

  // Admin member-management modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const ADMIN_EMAIL = "chenricky@gmail.com";
  const isAdmin = userEmail?.toLowerCase() === ADMIN_EMAIL;


  // Layer visibility state
  const [showNotes, setShowNotes] = useState(true);
  const [showToiletLayer, setShowToiletLayer] = useState(false);
  const [showTrailLayer, setShowTrailLayer] = useState(false);
  const [showRouteLayer, setShowRouteLayer] = useState(false);
  const [showFacilitiesLayer, setShowFacilitiesLayer] = useState(false);
  const [showBusLayer, setShowBusLayer] = useState(false);
  const [showTouristLayer, setShowTouristLayer] = useState(false);
  const [showHeatmapLayer, setShowHeatmapLayer] = useState(false);

  // Mobile auth FAB dropdown
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Bottom sheet expanded state — lifted here so the layer panel can react
  const [sheetExpanded, setSheetExpanded] = useState(false);

  // Which panel tabs (notes/bookmarks/layers) are shown — a per-device display
  // preference, not app data, so it's persisted to localStorage rather than synced.
  // Must start as DEFAULT_VISIBLE_TABS on both server and client-before-mount (the
  // server has no localStorage), then apply the real stored value in an effect —
  // reading it eagerly in a lazy useState initializer causes a hydration mismatch,
  // since that initializer re-runs on the client with localStorage available while
  // the server-rendered HTML reflects the default.
  const DEFAULT_VISIBLE_TABS = { notes: true, bookmarks: true, today: true, layers: true };
  const [visibleTabs, setVisibleTabs] = useState<Record<"notes" | "bookmarks" | "today" | "layers", boolean>>(DEFAULT_VISIBLE_TABS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("visibleTabs");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional post-mount sync from localStorage, required to keep SSR/client hydration output identical
      if (raw) setVisibleTabs({ ...DEFAULT_VISIBLE_TABS, ...JSON.parse(raw) });
    } catch {
      // Ignore malformed/inaccessible localStorage — fall back to all tabs visible.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- DEFAULT_VISIBLE_TABS is a stable literal, not state
  }, []);

  const handleToggleTabVisibility = useCallback((tab: "notes" | "bookmarks" | "today" | "layers") => {
    setVisibleTabs((prev) => {
      const next = { ...prev, [tab]: !prev[tab] };
      // Never let every tab be hidden — the panel would have nothing to show.
      if (!next.notes && !next.bookmarks && !next.today && !next.layers) return prev;
      try { localStorage.setItem("visibleTabs", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  // --vh: tracks window.innerHeight so the container always equals the
  // visible viewport, even after iOS URL-bar collapse fires a resize.
  useEffect(() => {
    const update = () =>
      document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Click target for modals
  const [clickTarget, setClickTarget] = useState<{ lat: number; lng: number } | null>(null);
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);

  // Edit existing sticky note
  const [editingNote, setEditingNote] = useState<StickyNote | null>(null);

  // View/discuss an existing today's-location (opened by clicking its map pin or list card)
  const [editingTodayLocation, setEditingTodayLocation] = useState<TodayLocation | null>(null);

  // Routing state
  const [routeStart, setRouteStart] = useState<RoutePoint | null>(null);
  const [routeEnd, setRouteEnd] = useState<RoutePoint | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(null);
  const [routeDistance, setRouteDistance] = useState<string | undefined>();
  const [routeDuration, setRouteDuration] = useState<string | undefined>();

  // Search result
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);

  // Fly-to target (bookmarks)
  const flyToKeyRef = useRef(0);
  const [flyToTarget, setFlyToTarget] = useState<{ bookmark: Bookmark; key: number } | null>(null);

  // Fly-to target (sticky notes)
  const flyToNoteKeyRef = useRef(0);
  const [flyToNoteTarget, setFlyToNoteTarget] = useState<{ lat: number; lng: number; key: number } | null>(null);

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
        createdBy: userEmail
          ? { name: userName ?? userEmail.split("@")[0], email: userEmail }
          : undefined,
      };
      saveData({ ...appData, bookmarks: [...appData.bookmarks, newBookmark] });
      setShowBookmarkModal(false);
      setClickTarget(null);
    },
    [clickTarget, appData, saveData, userEmail, userName]
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
        createdBy: userEmail
          ? { name: userName ?? userEmail, email: userEmail }
          : undefined,
        comments: [],
      };
      saveData({ ...appData, stickyNotes: [...appData.stickyNotes, newNote] });
      setShowNoteModal(false);
      setClickTarget(null);
    },
    [clickTarget, appData, saveData, userEmail, userName]
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

  // Today's-location handlers
  const handleSaveTodayLocation = useCallback(
    (label: string, timeStart?: string, timeEnd?: string) => {
      if (!clickTarget) return;
      const now = new Date();
      const planDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const newLocation: TodayLocation = {
        id: `today-${Date.now()}`,
        lat: clickTarget.lat,
        lng: clickTarget.lng,
        label,
        planDate,
        ...(timeStart ? { timeStart } : {}),
        ...(timeEnd ? { timeEnd } : {}),
        createdAt: now.toISOString(),
        createdBy: userEmail
          ? { name: userName ?? userEmail.split("@")[0], email: userEmail }
          : undefined,
        comments: [],
      };
      saveData({ ...appData, todayLocations: [...appData.todayLocations, newLocation] });
      setShowBookmarkModal(false);
      setClickTarget(null);
    },
    [clickTarget, appData, saveData, userEmail, userName]
  );

  // Open the discussion modal for a today's-location clicked directly on the map
  const handleTodayLocationClick = useCallback((loc: TodayLocation) => {
    setEditingTodayLocation(loc);
  }, []);

  const handleDeleteTodayLocation = useCallback(
    (id: string) => {
      saveData({
        ...appData,
        todayLocations: appData.todayLocations.filter((l) => l.id !== id),
      });
      setEditingTodayLocation(null);
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
        createdBy: userEmail
          ? { name: userName ?? userEmail.split("@")[0], email: userEmail }
          : undefined,
      };
      saveData({ ...appData, todos: [...appData.todos, newTodo] });
    },
    [appData, saveData, userEmail, userName]
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

  const handleSelectBookmark = useCallback((bm: Bookmark) => {
    flyToKeyRef.current += 1;
    setFlyToTarget({ bookmark: bm, key: flyToKeyRef.current });
  }, []);

  const handleSelectNote = useCallback((note: StickyNote) => {
    flyToNoteKeyRef.current += 1;
    setFlyToNoteTarget({ lat: note.lat, lng: note.lng, key: flyToNoteKeyRef.current });
    setShowNotes(true);   // ensure the notes layer is visible before flying to it
    setEditingNote(note); // open the note's edit/read modal on arrival
  }, []);

  // Fly-to + open the discussion modal for a today's-location selected from a list card
  const handleSelectTodayLocation = useCallback((loc: TodayLocation) => {
    flyToNoteKeyRef.current += 1;
    setFlyToNoteTarget({ lat: loc.lat, lng: loc.lng, key: flyToNoteKeyRef.current });
    setEditingTodayLocation(loc);
  }, []);

  if (isLoading) {
    return (
      <div className="fixed top-0 left-0 right-0 flex items-center justify-center bg-gray-50 md:relative md:inset-auto" style={{ height: "calc(var(--vh, 1vh) * 100)" }}>
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <div className="text-gray-600 font-medium">Loading Taiwan Maps...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 flex flex-col overflow-hidden bg-gray-50 md:relative md:inset-auto" style={{ height: "calc(var(--vh, 1vh) * 100)" }}>

      {/* ── Header: logo + search + auth ────────────────────────────────────── */}
      <header className="hidden md:flex md:items-center md:gap-3 md:relative md:z-50 md:shrink-0 md:bg-white md:border-b md:border-slate-200 md:px-3 md:py-2">
        <h1 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2 shrink-0">
          <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
            <MapIcon className="w-4 h-4" aria-hidden="true" />
          </span>
          <span className="hidden sm:inline">Taiwan Maps</span>
        </h1>
        <div className="flex-1 min-w-0">
          <SearchBar onSearchResult={setSearchResult} />
        </div>

        {/* ── Auth: user chip + admin + login/logout — unified h-10, rounded-lg, neutral secondary colors ── */}
        <div className="flex items-center gap-2 shrink-0">
          {/* User chip — desktop only */}
          {session?.user && (
            <span className="hidden sm:flex items-center gap-2 h-10 pl-1.5 pr-3 rounded-lg bg-slate-50 border border-slate-200 whitespace-nowrap">
              <span className="w-7 h-7 shrink-0 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                {(userName ?? userEmail ?? "?")[0]?.toUpperCase()}
              </span>
              <span className="text-sm font-medium text-slate-700 truncate max-w-[160px]">{userName ?? userEmail} 您好</span>
            </span>
          )}

          {/* Admin button — desktop only */}
          {isAdmin && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="hidden md:inline-flex items-center gap-1.5 h-10 px-3.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 text-sm font-medium transition-colors whitespace-nowrap
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
              title="管理成員白名單"
            >
              <Settings className="w-4 h-4 text-slate-500" aria-hidden="true" />
              成員管理
            </button>
          )}

          {/* Login / Logout — desktop only */}
          {sessionStatus !== "loading" && (
            session
              ? (
                <button
                  onClick={() => signOut()}
                  className="hidden md:inline-flex items-center gap-1.5 h-10 px-3.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 text-sm font-medium transition-colors whitespace-nowrap
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                  title="登出 Google 帳號"
                >
                  <LogOut className="w-4 h-4 text-slate-500" aria-hidden="true" />
                  登出
                </button>
              )
              : (
                <button
                  onClick={() => signIn("google")}
                  className="hidden md:inline-flex items-center gap-1.5 h-10 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium transition-colors whitespace-nowrap shadow-sm
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                  title="使用 Google 帳號登入"
                >
                  <LogIn className="w-4 h-4" aria-hidden="true" />
                  登入
                </button>
              )
          )}

          {/* ── Mobile: compact auth FAB + dropdown (hidden on desktop) ── */}
          <div className="relative md:hidden">
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm flex items-center justify-center shadow-md transition-colors"
              aria-label="選單"
              aria-expanded={mobileMenuOpen}
            >
              {session?.user
                ? (userName ?? userEmail ?? "?")[0]?.toUpperCase()
                : <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
              }
            </button>

            {mobileMenuOpen && (
              <>
                {/* Tap-away dismiss layer */}
                <div
                  className="fixed inset-0 z-[3000]"
                  onClick={() => setMobileMenuOpen(false)}
                />
                {/* Dropdown menu */}
                <div className="absolute top-full right-0 mt-2 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-[3001]">
                  {session?.user && (
                    <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100 truncate font-medium">
                      {userName ?? userEmail}
                    </div>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => { setShowInviteModal(true); setMobileMenuOpen(false); }}
                      className="w-full text-left px-3 py-2.5 text-sm text-purple-700 font-semibold hover:bg-purple-50 active:bg-purple-100 flex items-center gap-2 transition-colors"
                    >
                      <span>⚙️</span><span>成員管理</span>
                    </button>
                  )}
                  {sessionStatus !== "loading" && (
                    session ? (
                      <button
                        onClick={() => { signOut(); setMobileMenuOpen(false); }}
                        className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 flex items-center gap-2 transition-colors"
                      >
                        <span>👋</span><span>登出</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => { signIn("google"); setMobileMenuOpen(false); }}
                        className="w-full text-left px-3 py-2.5 text-sm text-blue-700 font-semibold hover:bg-blue-50 active:bg-blue-100 flex items-center gap-2 transition-colors"
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
      </header>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">

        {/* Map area — fills 100% of the main content area; side panels float on top */}
        <div className="absolute inset-0">
          <MapComponent
            bookmarks={appData.bookmarks}
            stickyNotes={appData.stickyNotes}
            todayLocations={appData.todayLocations}
            onMapClick={handleMapClick}
            onNoteClick={handleNoteClick}
            onTodayLocationClick={handleTodayLocationClick}
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
            flyToNoteTarget={flyToNoteTarget}
            sheetExpanded={sheetExpanded}
            visibleTabs={visibleTabs}
            onToggleTab={handleToggleTabVisibility}
          />

          {/* ── Combined desktop panel: bookmarks + sticky notes + layers in one tabbed pane ── */}
          {/* Mirrors the mobile bottom sheet's tab structure; expanded by default for a cleaner map view. */}
          <MapControlPanel
            notes={appData.stickyNotes}
            bookmarks={appData.bookmarks}
            todayLocations={appData.todayLocations}
            layers={LAYER_TOGGLES.map(l => ({
              ...l,
              active:   layerActive[l.key],
              onToggle: layerToggleHandlers[l.key],
            }))}
            onSelectNote={handleSelectNote}
            onSelectBookmark={handleSelectBookmark}
            onDeleteBookmark={handleDeleteBookmark}
            onSelectTodayLocation={handleSelectTodayLocation}
            visibleTabs={visibleTabs}
          />
        </div>
        {/* ── End map area ──────────────────────────────────────────────────── */}

        {/* RoutingPanel + TodoPanel — hidden from UI, all data + handlers fully preserved */}
        <div className="hidden">
          <RoutingPanel
            onRoute={handleRoute}
            routeCoords={routeCoords}
            routeDistance={routeDistance}
            routeDuration={routeDuration}
          />
          <TodoPanel
            todos={appData.todos}
            bookmarks={appData.bookmarks}
            onAddTodo={handleAddTodo}
            onToggleTodo={handleToggleTodo}
            onDeleteTodo={handleDeleteTodo}
          />
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {showBookmarkModal && clickTarget && (
        <BookmarkModal
          lat={clickTarget.lat}
          lng={clickTarget.lng}
          onSave={handleSaveBookmark}
          onAddNote={handleOpenNoteModal}
          onSaveToday={handleSaveTodayLocation}
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
          onClose={() => {
            setEditingNote(null);
            refreshData();
          }}
        />
      )}

      {/* View/discuss a today's-location — opened by clicking its pin or list card */}
      {editingTodayLocation && (
        <TodayLocationEditModal
          location={editingTodayLocation}
          onDelete={handleDeleteTodayLocation}
          onClose={() => {
            setEditingTodayLocation(null);
            refreshData();
          }}
        />
      )}

      {/* ── Admin: Invite Manager Modal ─────────────────────────────────────── */}
      {showInviteModal && isAdmin && (
        <InviteManagerModal
          invitedUsers={appData.invitedUsers}
          onClose={() => setShowInviteModal(false)}
          onRefresh={() => refreshData()}
        />
      )}

      {/* ── Mobile: bottom-sheet drawer (hidden on desktop) ── */}
      <MobileBottomSheet
        notes={appData.stickyNotes}
        bookmarks={appData.bookmarks}
        todayLocations={appData.todayLocations}
        layers={LAYER_TOGGLES.map(l => ({
          ...l,
          active:   layerActive[l.key],
          onToggle: layerToggleHandlers[l.key],
        }))}
        onSelectNote={handleSelectNote}
        onSelectBookmark={handleSelectBookmark}
        onDeleteBookmark={handleDeleteBookmark}
        onSelectTodayLocation={handleSelectTodayLocation}
        visibleTabs={visibleTabs}
        expanded={sheetExpanded}
        onExpandedChange={setSheetExpanded}
        searchConfig={{
          onSearchResult:    setSearchResult,
          sessionStatus,
          isLoggedIn:        !!session,
          userName,
          userEmail,
          isAdmin,
          mobileMenuOpen,
          onMobileMenuOpen:  setMobileMenuOpen,
          onSignIn:          () => signIn("google"),
          onSignOut:         () => signOut(),
          onShowInviteModal: () => setShowInviteModal(true),
        }}
      />

      {/* ── Status bar ──────────────────────────────────────────────────────── */}
      <footer className="hidden md:flex bg-slate-50 border-t border-slate-200 px-4 py-1.5 text-xs text-slate-500 items-center justify-between shrink-0 gap-3 overflow-hidden">
        <div className="flex items-center gap-3 min-w-0 overflow-x-auto">
          <span className="inline-flex items-center gap-1 shrink-0">
            <BookmarkIcon className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            {appData.bookmarks.length}
          </span>
          <span className="w-px h-3 bg-slate-200 shrink-0" />
          <span className="inline-flex items-center gap-1 shrink-0">
            <StickyNoteIcon className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            {appData.stickyNotes.length}
          </span>
          <span className="w-px h-3 bg-slate-200 shrink-0" />
          <span className="inline-flex items-center gap-1 shrink-0">
            <CheckSquare className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            {appData.todos.length}
          </span>
          {LAYER_TOGGLES.filter((l) => layerActive[l.key]).map((l) => (
            <span
              key={l.key}
              className={`inline-flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${LAYER_PILL_CLASS[l.key] ?? "bg-slate-100 text-slate-700"}`}
            >
              {l.icon} {l.label}
            </span>
          ))}
        </div>
        <span className="shrink-0 ml-2">OpenStreetMap &copy;</span>
      </footer>
    </div>
  );
}
