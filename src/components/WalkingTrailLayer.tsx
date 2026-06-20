"use client";

import { Polyline, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import trailsData from "@/data/walking_trails_graded.json";

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
  slope_pct: number;
  slope_color: string;
  slope_desc: string;
}

const trails = trailsData as Trail[];

// ── Slope legend badge ────────────────────────────────────────────────────────
function slopeBadge(color: string, desc: string, pct: number): string {
  const label =
    color === "#22C55E" ? "🟢 平坦安全" :
    color === "#EAB308" ? "🟡 微幅傾斜" :
    color === "#F97316" ? "🟠 陡坡注意" :
                          "🔴 極陡坡";
  return `
    <div style="
      display:inline-flex;align-items:center;gap:6px;
      background:${color}22;border:1.5px solid ${color};
      border-radius:8px;padding:4px 10px;margin-bottom:8px;
    ">
      <span style="font-size:13px;font-weight:700;color:${color === "#EAB308" ? "#92400e" : color};">
        ${label} ${pct}%
      </span>
    </div>
    <div style="font-size:12px;color:#6b7280;margin-bottom:8px;">${desc}</div>
  `;
}

// ── Start-point marker ────────────────────────────────────────────────────────
function makeStartIcon(color: string) {
  return L.divIcon({
    className: "trail-start-marker",
    html: `<div style="
      background:${color};
      color:white;
      width:30px;height:30px;
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.4);
      font-size:15px;
    ">🥾</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -32],
  });
}

export default function WalkingTrailLayer() {
  return (
    <>
      {trails.map((trail) => {
        const color     = trail.slope_color;   // DSM-graded color
        const startPoint = trail.path[0];
        const startIcon  = makeStartIcon(color);

        const popupContent = `
          <div style="max-width:340px;font-family:system-ui,sans-serif;line-height:1.6;">
            <div style="font-size:16px;font-weight:700;color:#1f2937;margin-bottom:6px;
                        border-bottom:2px solid ${color};padding-bottom:4px;">
              🥾 ${trail.name}
            </div>
            <div style="margin-bottom:6px;">
              <span style="background:#f3f4f6;color:#374151;padding:2px 8px;
                           border-radius:12px;font-size:12px;font-weight:600;">
                ${trail.district}
              </span>
              &nbsp;
              <span style="background:#eff6ff;color:#1d4ed8;padding:2px 8px;
                           border-radius:12px;font-size:12px;">
                ${trail.distance}
              </span>
            </div>

            ${slopeBadge(color, trail.slope_desc, trail.slope_pct)}

            <div style="font-size:13px;margin-bottom:5px;">
              <strong style="color:#374151;">📍 路線：</strong>
              <span style="color:#4b5563;">${trail.location}</span>
            </div>
            <div style="font-size:13px;margin-bottom:5px;">
              <strong style="color:#374151;">🌿 環境特色：</strong>
              <span style="color:#4b5563;">${trail.features.slice(0, 120)}${trail.features.length > 120 ? "…" : ""}</span>
            </div>
            <div style="font-size:13px;margin-bottom:5px;">
              <strong style="color:#374151;">🏠 地址：</strong>
              <span style="color:#4b5563;">${trail.address.slice(0, 80)}${trail.address.length > 80 ? "…" : ""}</span>
            </div>
            <div style="font-size:13px;margin-bottom:5px;">
              <strong style="color:#374151;">⏰ 開放時間：</strong>
              <span style="color:#4b5563;">${trail.openTime}</span>
              &nbsp;
              <strong style="color:#374151;">🅿️ 停車：</strong>
              <span style="color:#4b5563;">${trail.parking === "Y" ? "有" : "無"}</span>
            </div>
            <div style="font-size:12px;color:#6b7280;background:#f9fafb;
                        padding:6px 8px;border-radius:6px;border-left:3px solid ${color};">
              <strong>🚌 交通方式：</strong><br/>
              ${trail.transport.slice(0, 150)}${trail.transport.length > 150 ? "…" : ""}
            </div>
          </div>
        `;

        return (
          <div key={trail.id}>
            {/* Outer shadow stroke for contrast */}
            <Polyline
              positions={trail.path}
              pathOptions={{
                color: "#ffffff",
                weight: 9,
                opacity: 0.45,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
            {/* Main slope-graded polyline */}
            <Polyline
              positions={trail.path}
              pathOptions={{
                color,
                weight: 6,
                opacity: 0.88,
                lineCap: "round",
                lineJoin: "round",
              }}
            >
              <Popup maxWidth={360}>
                <div dangerouslySetInnerHTML={{ __html: popupContent }} />
              </Popup>
            </Polyline>

            {/* Start-point marker */}
            <Marker position={startPoint} icon={startIcon}>
              <Popup maxWidth={360}>
                <div dangerouslySetInnerHTML={{ __html: popupContent }} />
              </Popup>
            </Marker>
          </div>
        );
      })}
    </>
  );
}
