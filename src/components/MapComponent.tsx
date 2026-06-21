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
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Bookmark,
  StickyNote,
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

const customIcon = new L.DivIcon({
  className: "custom-marker",
  html: `<div style="background:#2563eb;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);font-size:16px;font-weight:bold;">📍</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const routeIcons = {
  start: L.divIcon({
    className: "route-marker-start",
    html: `<div style="background:#16a34a;color:white;padding:4px 8px;border-radius:6px;font-size:12px;font-weight:bold;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.3);">Start</div>`,
    iconSize: [60, 24],
    iconAnchor: [30, 12],
  }),
  end: L.divIcon({
    className: "route-marker-end",
    html: `<div style="background:#dc2626;color:white;padding:4px 8px;border-radius:6px;font-size:12px;font-weight:bold;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.3);">End</div>`,
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
  onMapClick: (lat: number, lng: number) => void;
  onNoteClick?: (note: StickyNote) => void;
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
}

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
  onMapClick,
  onNoteClick,
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
}: MapComponentProps) {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );
  const mapRef = useRef<L.Map | null>(null);

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
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

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
          <Marker position={userLocation}>
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
                html: `<div title="點擊編輯便利貼" style="cursor:pointer;background:${note.color};width:180px;padding:10px 8px 6px;border-radius:2px;box-shadow:2px 3px 8px rgba(0,0,0,0.2);font-family:'Comic Sans MS','Segoe Print',cursive;font-size:13px;line-height:1.4;transform:rotate(-2deg);word-wrap:break-word;min-height:40px;position:relative;">${note.content}<span style="position:absolute;bottom:3px;right:5px;font-size:10px;opacity:0.5;">✏️</span></div>`,
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

      {/* Controls overlay */}
      <div className="absolute bottom-8 right-4 z-[1000] flex flex-col gap-2">
        <button
          onClick={handleLocateMe}
          className="bg-white p-2.5 rounded-full shadow-lg hover:bg-gray-100 transition-colors"
          title="Locate Me"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-blue-600"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
