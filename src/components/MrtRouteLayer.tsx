"use client";

import { Polyline } from "react-leaflet";
import routesData from "@/data/mrt_routes.json";

interface RouteGeometry {
  type: "LineString" | "MultiLineString";
  coordinates: [number, number][] | [number, number][][];
}

interface MrtRoute {
  id: number;
  routeName: string;
  color: string;
  geometry: RouteGeometry;
}

const routes = routesData as MrtRoute[];

export default function MrtRouteLayer() {
  return (
    <>
      {routes.map((route) => {
        if (route.geometry.type === "LineString") {
          return (
            <Polyline
              key={`route-${route.id}`}
              positions={route.geometry.coordinates as [number, number][]}
              pathOptions={{
                color: route.color,
                weight: 4,
                opacity: 0.7,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          );
        } else {
          // MultiLineString — render each sub-line
          return (route.geometry.coordinates as [number, number][][]).map(
            (line, lineIdx) => (
              <Polyline
                key={`route-${route.id}-${lineIdx}`}
                positions={line}
                pathOptions={{
                  color: route.color,
                  weight: 4,
                  opacity: 0.7,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />
            )
          );
        }
      })}
    </>
  );
}
