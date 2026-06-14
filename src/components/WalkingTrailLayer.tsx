"use client";

import { Polyline, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import trailsData from "@/data/walking_trails.json";

interface Trail {
  id: number;
  name: string;
  district: string;
  location: string;
  distance: string;
  features: string;
  address: string;
  openTime: string;
  parking: string;
  transport: string;
  path: [number, number][];
}

const trails = trailsData as Trail[];

// Emerald green start-point marker
function makeStartIcon() {
  return L.divIcon({
    className: "trail-start-marker",
    html: `<div style="
      background: #059669;
      color: white;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      font-size: 14px;
    ">🥾</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30],
  });
}

const startIcon = makeStartIcon();

// Colour palette — cycle through for visual variety
const TRAIL_COLORS = [
  "#059669", // emerald
  "#0d9488", // teal
  "#0891b2", // cyan
  "#7c3aed", // violet
  "#db2777", // pink
  "#d97706", // amber
  "#16a34a", // green
  "#2563eb", // blue
];

export default function WalkingTrailLayer() {
  return (
    <>
      {trails.map((trail, idx) => {
        const color = TRAIL_COLORS[idx % TRAIL_COLORS.length];
        const startPoint = trail.path[0];

        const popupContent = `
          <div style="max-width:320px;font-family:system-ui,sans-serif;line-height:1.5;">
            <div style="font-size:15px;font-weight:700;color:#065f46;margin-bottom:6px;border-bottom:2px solid #d1fae5;padding-bottom:4px;">
              🥾 ${trail.name}
            </div>
            <div style="font-size:13px;color:#374151;margin-bottom:8px;">
              <span style="background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:12px;font-weight:600;font-size:12px;">
                ${trail.distance}
              </span>
              &nbsp;
              <span style="background:#f3f4f6;color:#6b7280;padding:2px 8px;border-radius:12px;font-size:12px;">
                ${trail.district}
              </span>
            </div>
            <div style="font-size:13px;margin-bottom:6px;">
              <strong style="color:#374151;">📍 路線：</strong>
              <span style="color:#4b5563;">${trail.location}</span>
            </div>
            <div style="font-size:13px;margin-bottom:6px;">
              <strong style="color:#374151;">🌿 環境特色：</strong>
              <span style="color:#4b5563;">${trail.features.slice(0, 120)}${trail.features.length > 120 ? "…" : ""}</span>
            </div>
            <div style="font-size:13px;margin-bottom:6px;">
              <strong style="color:#374151;">🏠 地址：</strong>
              <span style="color:#4b5563;">${trail.address.slice(0, 80)}${trail.address.length > 80 ? "…" : ""}</span>
            </div>
            <div style="font-size:13px;margin-bottom:6px;">
              <strong style="color:#374151;">⏰ 開放時間：</strong>
              <span style="color:#4b5563;">${trail.openTime}</span>
              &nbsp;
              <strong style="color:#374151;">🅿️ 停車：</strong>
              <span style="color:#4b5563;">${trail.parking === "Y" ? "有" : "無"}</span>
            </div>
            <div style="font-size:12px;color:#6b7280;background:#f9fafb;padding:6px 8px;border-radius:6px;border-left:3px solid #059669;">
              <strong>🚌 交通方式：</strong><br/>
              ${trail.transport.slice(0, 150)}${trail.transport.length > 150 ? "…" : ""}
            </div>
          </div>
        `;

        return (
          <div key={trail.id}>
            {/* Polyline path */}
            <Polyline
              positions={trail.path}
              pathOptions={{
                color,
                weight: 5,
                opacity: 0.82,
                lineCap: "round",
                lineJoin: "round",
              }}
            >
              <Popup maxWidth={340}>
                <div dangerouslySetInnerHTML={{ __html: popupContent }} />
              </Popup>
            </Polyline>

            {/* Start-point marker */}
            <Marker position={startPoint} icon={startIcon}>
              <Popup maxWidth={340}>
                <div dangerouslySetInnerHTML={{ __html: popupContent }} />
              </Popup>
            </Marker>
          </div>
        );
      })}
    </>
  );
}
