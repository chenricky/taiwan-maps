"use client";

import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import toiletData from "@/data/friendly_toilets.json";

interface ToiletEntry {
  id: number;
  nightMarket: string;
  name: string;
  address: string;
  openTime: string;
  closeTime: string;
  closedDay: string;
  lat: number;
  lng: number;
}

function createToiletIcon() {
  return L.divIcon({
    className: "toilet-marker",
    html: `
      <div style="
        background:#16a34a;
        color:#fff;
        border:2px solid #14532d;
        border-radius:6px;
        padding:2px 5px;
        font-size:11px;
        font-weight:bold;
        white-space:nowrap;
        box-shadow:0 2px 5px rgba(0,0,0,0.35);
        font-family:system-ui,sans-serif;
        line-height:1.3;
        display:flex;
        align-items:center;
        gap:2px;
      ">
        <span style="font-size:12px;">🚻</span>
      </div>
    `,
    iconSize: [32, 22],
    iconAnchor: [16, 11],
    popupAnchor: [0, -14],
  });
}

export default function FriendlyToiletLayer() {
  const toilets = toiletData as ToiletEntry[];

  return (
    <>
      {toilets.map((toilet) => (
        <Marker
          key={toilet.id}
          position={[toilet.lat, toilet.lng]}
          icon={createToiletIcon()}
        >
          <Popup maxWidth={300} minWidth={220}>
            <div style={{ fontFamily: "system-ui, sans-serif", fontSize: "14px" }}>
              {/* Header */}
              <div
                style={{
                  background: "#16a34a",
                  color: "#fff",
                  borderRadius: "6px 6px 0 0",
                  padding: "8px 12px",
                  margin: "-8px -12px 10px -12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span style={{ fontSize: "18px" }}>🚻</span>
                <div>
                  <div style={{ fontWeight: "bold", fontSize: "15px" }}>
                    {toilet.name}
                  </div>
                  {toilet.nightMarket && (
                    <div style={{ fontSize: "11px", opacity: 0.9 }}>
                      📍 {toilet.nightMarket}
                    </div>
                  )}
                </div>
              </div>

              {/* Details */}
              <div
                style={{
                  background: "#f0fdf4",
                  borderRadius: "6px",
                  padding: "10px 12px",
                  border: "1px solid #bbf7d0",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                {/* Address */}
                <div style={{ fontSize: "12px", color: "#374151", display: "flex", gap: "6px" }}>
                  <span style={{ flexShrink: 0 }}>🏠</span>
                  <span>{toilet.address}</span>
                </div>

                {/* Hours */}
                <div style={{ fontSize: "12px", color: "#374151", display: "flex", gap: "6px" }}>
                  <span style={{ flexShrink: 0 }}>🕐</span>
                  <span>
                    <strong>開放時間：</strong>
                    {toilet.openTime === "00:00" && toilet.closeTime === "23:59"
                      ? "全天開放"
                      : `${toilet.openTime} – ${toilet.closeTime}`}
                  </span>
                </div>

                {/* Closed day */}
                <div style={{ fontSize: "12px", color: "#374151", display: "flex", gap: "6px" }}>
                  <span style={{ flexShrink: 0 }}>📅</span>
                  <span>
                    <strong>公休日：</strong>
                    {toilet.closedDay === "無" ? "全年無休" : toilet.closedDay}
                  </span>
                </div>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}
