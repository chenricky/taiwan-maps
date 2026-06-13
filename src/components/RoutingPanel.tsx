"use client";

import { useState } from "react";
import { RoutePoint, TravelMode } from "@/types";

interface RoutingPanelProps {
  onRoute: (start: RoutePoint, end: RoutePoint, mode: TravelMode) => void;
  routeCoords: [number, number][] | null;
  routeDistance?: string;
  routeDuration?: string;
}

export default function RoutingPanel({
  onRoute,
  routeCoords,
  routeDistance,
  routeDuration,
}: RoutingPanelProps) {
  const [startQuery, setStartQuery] = useState("");
  const [endQuery, setEndQuery] = useState("");
  const [mode, setMode] = useState<TravelMode>("driving");
  const [isLoading, setIsLoading] = useState(false);

  const geocodeLocation = async (query: string): Promise<RoutePoint | null> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=1&countrycodes=tw`
      );
      const data = await res.json();
      if (data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleRoute = async () => {
    if (!startQuery.trim() || !endQuery.trim()) return;
    setIsLoading(true);

    const start = await geocodeLocation(startQuery);
    const end = await geocodeLocation(endQuery);

    if (start && end) {
      onRoute(start, end, mode);
    } else {
      alert("Could not find one or both locations. Please try different search terms.");
    }
    setIsLoading(false);
  };

  const modeOptions: { value: TravelMode; label: string; icon: string }[] = [
    { value: "driving", label: "Driving", icon: "🚗" },
    { value: "walking", label: "Walking", icon: "🚶" },
    { value: "cycling", label: "Cycling", icon: "🚲" },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <span>📍</span> Directions
      </h3>

      <div className="space-y-2">
        <input
          type="text"
          value={startQuery}
          onChange={(e) => setStartQuery(e.target.value)}
          placeholder="Start location..."
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <input
          type="text"
          value={endQuery}
          onChange={(e) => setEndQuery(e.target.value)}
          placeholder="End location..."
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      {/* Travel mode toggles */}
      <div className="flex gap-1 my-3">
        {modeOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setMode(opt.value)}
            className={`flex-1 px-2 py-1.5 text-xs rounded-md font-medium transition-colors ${
              mode === opt.value
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {opt.icon} {opt.label}
          </button>
        ))}
      </div>

      <button
        onClick={handleRoute}
        disabled={isLoading || !startQuery.trim() || !endQuery.trim()}
        className="w-full py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {isLoading ? "Calculating..." : "Get Directions"}
      </button>

      {routeDistance && routeDuration && (
        <div className="mt-3 p-2 bg-green-50 rounded-md text-sm">
          <div className="font-medium text-green-800">Route Summary</div>
          <div className="text-green-700 text-xs mt-1">
            Distance: {routeDistance} | Duration: {routeDuration}
          </div>
        </div>
      )}
    </div>
  );
}