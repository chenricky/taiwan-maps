"use client";

import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import spotsData from "@/data/tourist_spots.json";

interface TouristSpot {
  name: string;
  district: string;
  theme: string;
  lat: number;
  lng: number;
}

function createTouristIcon() {
  return L.divIcon({
    className: "tourist-spot-marker",
    html: `
      <div style="
        background: linear-gradient(135deg, #f59e0b, #d97706);
        color: #fff;
        border: 2.5px solid #92400e;
        border-radius: 50%;
        width: 34px;
        height: 34px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 17px;
        box-shadow: 0 3px 8px rgba(0,0,0,0.40);
        cursor: pointer;
      ">✨</div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -36],
  });
}

export default function TouristSpotsLayer() {
  const spots = spotsData as TouristSpot[];

  return (
    <>
      {spots.map((spot, idx) => (
        <Marker
          key={`tourist-${idx}-${spot.name}`}
          position={[spot.lat, spot.lng]}
          icon={createTouristIcon()}
        >
          <Popup maxWidth={320} minWidth={260}>
            <div style={{ fontFamily: "system-ui, 'Noto Sans TC', sans-serif" }}>
              {/* Header */}
              <div
                style={{
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  color: "#fff",
                  borderRadius: "8px 8px 0 0",
                  padding: "10px 14px",
                  margin: "-8px -12px 12px -12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span style={{ fontSize: "22px", flexShrink: 0 }}>✨</span>
                <div style={{ fontWeight: "bold", fontSize: "17px", lineHeight: 1.3 }}>
                  {spot.name}
                </div>
              </div>

              {/* Body */}
              <div
                style={{
                  background: "#fffbeb",
                  borderRadius: "8px",
                  padding: "12px 14px",
                  border: "1px solid #fde68a",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {/* District */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    fontSize: "15px",
                    color: "#374151",
                  }}
                >
                  <span style={{ flexShrink: 0, fontSize: "16px" }}>📍</span>
                  <div>
                    <span style={{ fontWeight: "600", color: "#92400e" }}>行政區：</span>
                    <span>{spot.district}</span>
                  </div>
                </div>

                {/* Theme */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    fontSize: "15px",
                    color: "#374151",
                  }}
                >
                  <span style={{ flexShrink: 0, fontSize: "16px" }}>🗺️</span>
                  <div>
                    <span style={{ fontWeight: "600", color: "#92400e" }}>主題景點：</span>
                    <span>{spot.theme}</span>
                  </div>
                </div>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}
