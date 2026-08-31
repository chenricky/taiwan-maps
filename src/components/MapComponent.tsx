"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  useMap,
  Marker,
  Popup,
  Polyline,
  useMapEvents,
  ZoomControl,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Settings,
  LocateFixed,
  StickyNote as StickyNoteIcon,
  Bookmark as BookmarkIcon,
  Calendar,
  Layers,
  type LucideIcon,
} from "lucide-react";
import {
  Bookmark,
  StickyNote,
  TodayLocation,
  RoutePoint,
  SearchResult,
} from "@/types";
import FriendlyToiletLayer from "@/components/FriendlyToiletLayer";
import WalkingTrailLayer from "@/components/WalkingTrailLayer";
import MrtRouteLayer from "@/components/MrtRouteLayer";
import MrtFacilitiesLayer from "@/components/MrtFacilitiesLayer";
import BusTransferLayer from "@/components/BusTransferLayer";
import TouristSpotsLayer from "@/components/TouristSpotsLayer";
import SlopeHeatmapLayer from "@/components/SlopeHeatmapLayer";

interface FlyToTarget {
  bookmark: Bookmark;
  key: number;
}

// Fix Leaflet default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// ── Hand-copied Lucide-style SVG glyphs for Leaflet divIcon markup ──────────────
// L.divIcon's `html` is raw HTML, not JSX — react components can't be rendered
// into it, so these are inline SVG strings matching the same icons used in the
// React-rendered panels (Bookmark, Calendar) for visual consistency. Every <svg>
// declares viewBox/width/height/fill/stroke explicitly since no Tailwind/React
// styling reaches this markup.
const BOOKMARK_GLYPH = `<svg viewBox="0 0 24 24" width="16" height="16" fill="white" stroke="none"><path d="M6 3a2 2 0 00-2 2v16l8-5.333L20 21V5a2 2 0 00-2-2H6z"/></svg>`;
const CALENDAR_GLYPH = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
const PENCIL_GLYPH = `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#1e293b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>`;

const customIcon = new L.DivIcon({
  className: "custom-marker",
  html: `<div style="background:linear-gradient(135deg,#3b82f6,#2563eb);width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 6px rgba(15,23,42,0.3);">${BOOKMARK_GLYPH}</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

// Local (not UTC) "YYYY-MM-DD" — matches how TodayLocation.planDate is stamped on save.
function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Today's-location pins stay compact (not the big sticky-note box) since they're more
// numerous/transient than curated notes — clicking opens the discussion modal directly.
const todayIcon = new L.DivIcon({
  className: "today-location-marker",
  html: `<div style="background:linear-gradient(135deg,#10b981,#059669);width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 6px rgba(15,23,42,0.3);cursor:pointer;">${CALENDAR_GLYPH}</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

// "You are here" — a pulsing halo + solid dot, distinct from POI pins and replacing
// Leaflet's default CDN teardrop marker (which clashed with the custom pin language).
const userLocationIcon = new L.DivIcon({
  className: "user-location-marker",
  html: `<div style="position:relative;width:20px;height:20px;">
    <div style="position:absolute;inset:-10px;border-radius:50%;background:rgba(37,99,235,0.2);animation:userLocationPulse 2s ease-out infinite;"></div>
    <div style="position:absolute;inset:0;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 1px 4px rgba(15,23,42,0.35);"></div>
  </div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const routeIcons = {
  start: L.divIcon({
    className: "route-marker-start",
    html: `<div style="background:#16a34a;color:white;padding:4px 8px;border-radius:6px;font-size:12px;font-weight:bold;white-space:nowrap;box-shadow:0 2px 4px rgba(15,23,42,0.3);">Start</div>`,
    iconSize: [60, 24],
    iconAnchor: [30, 12],
  }),
  end: L.divIcon({
    className: "route-marker-end",
    html: `<div style="background:#dc2626;color:white;padding:4px 8px;border-radius:6px;font-size:12px;font-weight:bold;white-space:nowrap;box-shadow:0 2px 4px rgba(15,23,42,0.3);">End</div>`,
    iconSize: [60, 24],
    iconAnchor: [30, 12],
  }),
};

interface NoteTarget {
  lat: number;
  lng: number;
  key: number;
}

interface MapComponentProps {
  bookmarks: Bookmark[];
  stickyNotes: StickyNote[];
  todayLocations: TodayLocation[];
  onMapClick: (lat: number, lng: number) => void;
  onNoteClick?: (note: StickyNote) => void;
  onTodayLocationClick?: (loc: TodayLocation) => void;
  onBookmarkSelect?: (bookmark: Bookmark) => void;
  routeStart: RoutePoint | null;
  routeEnd: RoutePoint | null;
  routeCoords: [number, number][] | null;
  showNotes: boolean;
  showToiletLayer: boolean;
  showTrailLayer: boolean;
  showRouteLayer: boolean;
  showFacilitiesLayer: boolean;
  showBusLayer: boolean;
  showTouristLayer: boolean;
  showHeatmapLayer: boolean;
  searchResult: SearchResult | null;
  flyToTarget?: FlyToTarget | null;
  flyToNoteTarget?: NoteTarget | null;
  /** Whether the mobile bottom sheet is expanded — hides the locate-me FAB so it doesn't float over the sheet content. */
  sheetExpanded?: boolean;
  /** Which panel tabs (notes/bookmarks/today/layers) are currently shown — drives the settings popover's checkboxes. */
  visibleTabs?: Record<PanelTab, boolean>;
  onToggleTab?: (tab: PanelTab) => void;
}

type PanelTab = "notes" | "bookmarks" | "today" | "layers";

const SETTINGS_TABS: { key: PanelTab; label: string; icon: LucideIcon }[] = [
  { key: "notes",     label: "便利貼", icon: StickyNoteIcon },
  { key: "bookmarks", label: "書籤",   icon: BookmarkIcon   },
  { key: "today",     label: "今日",   icon: Calendar       },
  { key: "layers",    label: "圖層",   icon: Layers         },
];

function MapController({
  searchResult,
  routeStart,
  routeEnd,
  flyToTarget,
  flyToNoteTarget,
}: {
  searchResult: SearchResult | null;
  routeStart: RoutePoint | null;
  routeEnd: RoutePoint | null;
  flyToTarget?: FlyToTarget | null;
  flyToNoteTarget?: NoteTarget | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (searchResult) {
      map.flyTo([parseFloat(searchResult.lat), parseFloat(searchResult.lon)], 14);
    }
  }, [searchResult, map]);

  useEffect(() => {
    if (routeStart && routeEnd) {
      const bounds = L.latLngBounds(
        [routeStart.lat, routeStart.lng],
        [routeEnd.lat, routeEnd.lng]
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [routeStart, routeEnd, map]);

  useEffect(() => {
    if (flyToTarget) {
      map.flyTo([flyToTarget.bookmark.lat, flyToTarget.bookmark.lng], 14);
    }
  }, [flyToTarget, map]);

  useEffect(() => {
    if (flyToNoteTarget) {
      map.flyTo([flyToNoteTarget.lat, flyToNoteTarget.lng], 16);
    }
  }, [flyToNoteTarget, map]);

  return null;
}

function ClickHandler({
  onMapClick,
}: {
  onMapClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapComponent({
  bookmarks,
  stickyNotes,
  todayLocations,
  onMapClick,
  onNoteClick,
  onTodayLocationClick,
  routeStart,
  routeEnd,
  routeCoords,
  showNotes,
  showToiletLayer,
  showTrailLayer,
  showRouteLayer,
  showFacilitiesLayer,
  showBusLayer,
  showTouristLayer,
  showHeatmapLayer,
  searchResult,
  flyToTarget,
  flyToNoteTarget,
  sheetExpanded = false,
  visibleTabs = { notes: true, bookmarks: true, today: true, layers: true },
  onToggleTab,
}: MapComponentProps) {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  // Tracks whether we're below Tailwind's `md` breakpoint (768px) — determines
  // which corner the zoom control docks to and how the locate-me FAB is positioned.
  const [isMobile, setIsMobile] = useState(false);

  // When the iOS URL bar collapses the viewport expands and Leaflet's tile grid
  // becomes misaligned. Calling invalidateSize() forces Leaflet to recompute
  // its internal dimensions and re-render tiles to fill the new geometry.
  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth < 768);
      setTimeout(() => mapRef.current?.invalidateSize(), 100);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleLocateMe = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setUserLocation([latitude, longitude]);
          if (mapRef.current) {
            mapRef.current.flyTo([latitude, longitude], 15);
          }
        },
        (err) => {
          console.error("Geolocation error:", err);
          alert("Could not get your location. Please check browser permissions.");
        }
      );
    }
  }, []);

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[25.0478, 121.5170]}
        zoom={12}
        className="h-full w-full z-0"
        ref={mapRef}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {/* Desktop: top-right (top-left is occupied by the floating layer panel). Mobile: top-left is free since the layer panel lives in the bottom sheet instead. */}
        <ZoomControl position={isMobile ? "topleft" : "topright"} />

        <MapController
          searchResult={searchResult}
          routeStart={routeStart}
          routeEnd={routeEnd}
          flyToTarget={flyToTarget}
          flyToNoteTarget={flyToNoteTarget}
        />

        <ClickHandler onMapClick={onMapClick} />

        {/* MRT Route Lines Layer */}
        {showRouteLayer && <MrtRouteLayer />}

        {/* MRT Station Facilities Layer (elevators & ramps) */}
        {showFacilitiesLayer && <MrtFacilitiesLayer />}

        {/* Friendly Toilet Layer */}
        {showToiletLayer && <FriendlyToiletLayer />}

        {/* Walking Trail Layer */}
        {showTrailLayer && <WalkingTrailLayer />}

        {/* Bus Transfer Layer */}
        {showBusLayer && <BusTransferLayer visible={showBusLayer} />}

        {/* Slope Heatmap Layer — rendered BELOW other layers so markers stay visible */}
        {showHeatmapLayer && <SlopeHeatmapLayer />}

        {/* Tourist Spots Layer */}
        {showTouristLayer && <TouristSpotsLayer />}

        {/* User location */}
        {userLocation && (
          <Marker position={userLocation} icon={userLocationIcon}>
            <Popup>You are here</Popup>
          </Marker>
        )}

        {/* Bookmarks */}
        {bookmarks.map((bm) => (
          <Marker key={bm.id} position={[bm.lat, bm.lng]} icon={customIcon}>
            <Popup>
              <div className="font-medium">{bm.label}</div>
              <div className="text-xs text-gray-500">
                {bm.lat.toFixed(5)}, {bm.lng.toFixed(5)}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Sticky Notes — click opens edit/delete modal */}
        {showNotes &&
          stickyNotes.map((note) => (
            <Marker
              key={note.id}
              position={[note.lat, note.lng]}
              icon={L.divIcon({
                className: "sticky-note-marker",
                // A translucent white wash over the note's own color softens/desaturates it
                // uniformly regardless of which of the 6 preset hues it is, rather than
                // hand-deriving a separate desaturated hex value per color.
                html: `<div title="點擊編輯便利貼" style="cursor:pointer;background:linear-gradient(rgba(255,255,255,0.4),rgba(255,255,255,0.4)),${note.color};color:#1e293b;width:180px;padding:10px 8px 6px;border-radius:6px;box-shadow:0 2px 6px -1px rgba(15,23,42,0.15),0 4px 10px -2px rgba(15,23,42,0.1);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;line-height:1.4;transform:rotate(-2deg);word-wrap:break-word;min-height:40px;position:relative;">${note.content}<span style="position:absolute;bottom:4px;right:5px;opacity:0.45;">${PENCIL_GLYPH}</span></div>`,
                iconSize: [180, 50],
                iconAnchor: [90, 25],
              })}
              eventHandlers={{
                click: (e) => {
                  e.originalEvent?.stopPropagation();
                  onNoteClick?.(note);
                },
              }}
            />
          ))}

        {/* Today's Locations — only today's plans are shown as live pins; click opens the discussion modal */}
        {todayLocations
          .filter((loc) => loc.planDate === todayDateStr())
          .map((loc) => (
            <Marker
              key={loc.id}
              position={[loc.lat, loc.lng]}
              icon={todayIcon}
              eventHandlers={{
                click: (e) => {
                  e.originalEvent?.stopPropagation();
                  onTodayLocationClick?.(loc);
                },
              }}
            />
          ))}

        {/* Route markers */}
        {routeStart && (
          <Marker position={[routeStart.lat, routeStart.lng]} icon={routeIcons.start} />
        )}
        {routeEnd && (
          <Marker position={[routeEnd.lat, routeEnd.lng]} icon={routeIcons.end} />
        )}

        {/* Route polyline */}
        {routeCoords && routeCoords.length > 0 && (
          <Polyline
            positions={routeCoords}
            pathOptions={{
              color: "#2563eb",
              weight: 5,
              opacity: 0.8,
            }}
          />
        )}
      </MapContainer>

      {/* Controls overlay, bottom-right.
          Mobile: floated above the bottom sheet's collapsed handle (and above its z-[2000]
          stacking context); hidden while the sheet is expanded so it doesn't float over its content. */}
      <div
        className={`absolute right-4 flex flex-col gap-2
          bottom-[calc(160px+env(safe-area-inset-bottom,0px))] md:bottom-8
          ${isMobile ? "z-[2001]" : "z-[1000]"}
          ${sheetExpanded ? "hidden md:flex" : "flex"}`}
      >
        {/* Panel-tab visibility settings — opens above the locate-me button */}
        <div className="relative">
          <button
            onClick={() => setSettingsOpen((v) => !v)}
            className="bg-white/90 backdrop-blur-md p-2.5 rounded-full border border-slate-200/60
                       shadow-[0_2px_6px_rgba(15,23,42,0.12),0_1px_2px_rgba(15,23,42,0.08)]
                       hover:bg-white transition-colors"
            title="顯示設定"
            aria-label="顯示設定"
            aria-expanded={settingsOpen}
          >
            <Settings className="h-5 w-5 text-slate-600" aria-hidden="true" />
          </button>

          {settingsOpen && (
            <>
              {/* Tap-away dismiss layer */}
              <div className="fixed inset-0 z-0" onClick={() => setSettingsOpen(false)} />
              <div className="absolute bottom-full right-0 mb-2 w-44 bg-white/95 backdrop-blur-md rounded-xl
                               border border-slate-200/80
                               shadow-[0_2px_8px_-2px_rgba(15,23,42,0.08),0_12px_24px_-8px_rgba(15,23,42,0.12)]
                               py-1.5 z-10">
                <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 border-b border-slate-100 whitespace-nowrap">
                  顯示分頁
                </div>
                {SETTINGS_TABS.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <label
                      key={tab.key}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
                    >
                      <input
                        type="checkbox"
                        checked={visibleTabs[tab.key]}
                        onChange={() => onToggleTab?.(tab.key)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <Icon className="w-4 h-4 text-slate-400" aria-hidden="true" />
                      {tab.label}
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <button
          onClick={handleLocateMe}
          className="bg-white/90 backdrop-blur-md p-2.5 rounded-full border border-slate-200/60
                     shadow-[0_2px_6px_rgba(15,23,42,0.12),0_1px_2px_rgba(15,23,42,0.08)]
                     hover:bg-white transition-colors"
          title="Locate Me"
        >
          <LocateFixed className="h-5 w-5 text-blue-600" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
