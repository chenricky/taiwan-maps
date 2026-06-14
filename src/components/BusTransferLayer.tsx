'use client';

import { useEffect } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import busTransfers from '@/data/mrt_bus_transfers.json';

interface BusTransferPoint {
  station: string;
  exit: string;
  lat: number;
  lng: number;
  buses: string[];
}

const data = busTransfers as BusTransferPoint[];

// Bus icon using a distinctive emoji-style marker
function createBusIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="
      background: #f59e0b;
      border: 3px solid #92400e;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      cursor: pointer;
    ">🚌</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

interface BusTransferLayerProps {
  visible: boolean;
}

export default function BusTransferLayer({ visible }: BusTransferLayerProps) {
  const map = useMap();

  useEffect(() => {
    if (!visible) return;

    const markers: L.Marker[] = [];
    const busIcon = createBusIcon();

    for (const point of data) {
      const busList = point.buses
        .map(b => `<li style="padding:2px 0;border-bottom:1px solid #f3f4f6;font-size:15px;">${b}</li>`)
        .join('');

      const popupContent = `
        <div style="min-width:260px;max-width:320px;font-family:sans-serif;">
          <div style="background:#f59e0b;color:#fff;padding:10px 14px;border-radius:8px 8px 0 0;margin:-12px -12px 10px -12px;">
            <div style="font-size:18px;font-weight:bold;">🚌 ${point.station}</div>
            <div style="font-size:14px;opacity:0.9;">${point.exit} 公車轉乘資訊</div>
          </div>
          <div style="max-height:192px;overflow-y:auto;padding-right:4px;">
            <ul style="list-style:none;margin:0;padding:0;">
              ${busList}
            </ul>
          </div>
          <div style="margin-top:8px;font-size:12px;color:#9ca3af;text-align:right;">
            共 ${point.buses.length} 條路線
          </div>
        </div>
      `;

      const marker = L.marker([point.lat, point.lng], { icon: busIcon })
        .bindPopup(popupContent, { maxWidth: 340, maxHeight: 320 });

      marker.addTo(map);
      markers.push(marker);
    }

    return () => {
      markers.forEach(m => m.remove());
    };
  }, [map, visible]);

  return null;
}
