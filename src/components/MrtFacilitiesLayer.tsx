"use client";

import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import facilities from "@/data/mrt_facilities.json";

const elevatorIcon = new L.DivIcon({
  className: "",
  html: `<div style="
    background:#1d4ed8;
    color:white;
    width:28px;
    height:28px;
    border-radius:6px;
    display:flex;
    align-items:center;
    justify-content:center;
    border:2px solid white;
    box-shadow:0 2px 6px rgba(0,0,0,0.35);
    font-size:15px;
    line-height:1;
  ">🛗</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -30],
});

const rampIcon = new L.DivIcon({
  className: "",
  html: `<div style="
    background:#ea580c;
    color:white;
    width:28px;
    height:28px;
    border-radius:6px;
    display:flex;
    align-items:center;
    justify-content:center;
    border:2px solid white;
    box-shadow:0 2px 6px rgba(0,0,0,0.35);
    font-size:15px;
    line-height:1;
  ">♿</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -30],
});

export default function MrtFacilitiesLayer() {
  return (
    <>
      {facilities.map((f) => (
        <Marker
          key={f.id}
          position={[f.lat, f.lng]}
          icon={f.type === "elevator" ? elevatorIcon : rampIcon}
        >
          <Popup>
            <div style={{ minWidth: "160px" }}>
              <div style={{ fontSize: "15px", fontWeight: "700", lineHeight: "1.4", marginBottom: "6px", color: f.type === "elevator" ? "#1d4ed8" : "#ea580c" }}>
                {f.type === "elevator" ? "🛗 電梯" : "♿ 無障礙坡道"}
              </div>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "#111827", marginBottom: "4px" }}>
                {f.name}
              </div>
              <div style={{ fontSize: "13px", color: "#6b7280" }}>
                出入口：{f.exit}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}
