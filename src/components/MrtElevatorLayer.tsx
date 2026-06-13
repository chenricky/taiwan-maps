"use client";

import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import mrtStations from "@/data/mrt_stations.json";

// Line color mapping
const LINE_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  文湖線: { bg: "#C48A00", text: "#fff", border: "#8B6200", label: "Brown" },
  板南線: { bg: "#0070BD", text: "#fff", border: "#004F8A", label: "Blue" },
  淡水信義線: { bg: "#E3002C", text: "#fff", border: "#A80020", label: "Red" },
  松山新店線: { bg: "#008659", text: "#fff", border: "#005C3C", label: "Green" },
  中和新蘆線: { bg: "#F5A623", text: "#fff", border: "#C07800", label: "Orange" },
  環狀線: { bg: "#FECC02", text: "#333", border: "#C9A200", label: "Yellow" },
};

function createMrtIcon(code: string, line: string) {
  const colors = LINE_COLORS[line] || { bg: "#666", text: "#fff", border: "#333", label: "" };
  return L.divIcon({
    className: "mrt-station-marker",
    html: `
      <div style="
        background:${colors.bg};
        color:${colors.text};
        border:2px solid ${colors.border};
        border-radius:6px;
        padding:2px 5px;
        font-size:10px;
        font-weight:bold;
        white-space:nowrap;
        box-shadow:0 2px 5px rgba(0,0,0,0.35);
        font-family:system-ui,sans-serif;
        line-height:1.3;
        display:flex;
        align-items:center;
        gap:3px;
      ">
        <span style="font-size:11px;">♿</span>
        <span>${code}</span>
      </div>
    `,
    iconSize: [60, 22],
    iconAnchor: [30, 11],
    popupAnchor: [0, -14],
  });
}

interface MrtStation {
  code: string;
  name: string;
  line: string;
  lat: number;
  lng: number;
  elevatorInfo: string;
}

export default function MrtElevatorLayer() {
  const stations = mrtStations as MrtStation[];

  return (
    <>
      {stations.map((station) => (
        <Marker
          key={station.code}
          position={[station.lat, station.lng]}
          icon={createMrtIcon(station.code, station.line)}
        >
          <Popup maxWidth={320} minWidth={240}>
            <div style={{ fontFamily: "system-ui, sans-serif", fontSize: "14px" }}>
              {/* Header */}
              <div
                style={{
                  background: LINE_COLORS[station.line]?.bg || "#666",
                  color: LINE_COLORS[station.line]?.text || "#fff",
                  borderRadius: "6px 6px 0 0",
                  padding: "8px 12px",
                  margin: "-8px -12px 10px -12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span style={{ fontSize: "18px" }}>♿</span>
                <div>
                  <div style={{ fontWeight: "bold", fontSize: "16px" }}>
                    {station.name}
                  </div>
                  <div style={{ fontSize: "11px", opacity: 0.9 }}>
                    {station.code} · {station.line}
                  </div>
                </div>
              </div>

              {/* Elevator info */}
              <div
                style={{
                  background: "#f8f9fa",
                  borderRadius: "6px",
                  padding: "10px 12px",
                  border: "1px solid #e9ecef",
                }}
              >
                <div
                  style={{
                    fontWeight: "600",
                    fontSize: "12px",
                    color: "#495057",
                    marginBottom: "6px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  🛗 無障礙電梯位置
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#212529",
                    lineHeight: "1.7",
                    whiteSpace: "pre-line",
                  }}
                >
                  {station.elevatorInfo}
                </div>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}
