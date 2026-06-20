"use client";

/**
 * SlopeHeatmapLayer.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders the Taipei slope heatmap as a smooth, continuous canvas overlay
 * instead of rigid Leaflet Rectangles.
 *
 * RENDERING STRATEGY:
 *   • Uses a Leaflet custom Layer (L.Layer) that owns a single <canvas> element
 *     sized to the full map viewport.
 *   • On every map move/zoom the canvas is repositioned and redrawn.
 *   • Each grid node is painted as a filled rectangle whose pixel dimensions
 *     match the projected cell size — NO borders, NO stroke.
 *   • The canvas pane is styled with opacity: 0.28 + mix-blend-mode: multiply
 *     so the colour wash sits gently over the base map and all labels/icons
 *     remain fully legible.
 *
 * DATA FORMAT (taipei_slope_grid.json):
 *   Array of [lat, lng, slope_pct] triples produced by preprocess-heatmap.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import rawGrid from "@/data/taipei_slope_grid.json";

// ── Type helpers ──────────────────────────────────────────────────────────────
type GridTriple = [number, number, number]; // [lat, lng, slope_pct]
const gridData = rawGrid as GridTriple[];

// ── Grid geometry constants (must match preprocess-heatmap.js) ────────────────
const GRID_N   = 120;
const GRID_M   = 120;
const LAT_MIN  = 24.95;
const LAT_MAX  = 25.20;
const LNG_MIN  = 121.45;
const LNG_MAX  = 121.65;
// Half-cell sizes in degrees (used to compute each cell's bounding box)
const HALF_LAT = (LAT_MAX - LAT_MIN) / (GRID_N - 1) / 2;
const HALF_LNG = (LNG_MAX - LNG_MIN) / (GRID_M - 1) / 2;

// ── Colour ramp (matches preprocess-heatmap.js thresholds) ───────────────────
function slopeRgba(pct: number): string {
  if (pct < 3)   return "rgba(34,197,94,1)";    // #22C55E green
  if (pct < 5)   return "rgba(234,179,8,1)";    // #EAB308 yellow
  if (pct < 8.3) return "rgba(249,115,22,1)";   // #F97316 orange
  return               "rgba(239,68,68,1)";     // #EF4444 red
}

// ── Canvas Leaflet layer ──────────────────────────────────────────────────────
class SlopeCanvasLayer extends L.Layer {
  private _cvs: HTMLCanvasElement | null = null;
  private _leafletMap: L.Map | null = null;

  onAdd(map: L.Map): this {
    this._leafletMap = map;

    const canvas = L.DomUtil.create("canvas", "slope-heatmap-canvas") as HTMLCanvasElement;
    canvas.style.position        = "absolute";
    canvas.style.top             = "0";
    canvas.style.left            = "0";
    canvas.style.pointerEvents   = "none";
    canvas.style.opacity         = "0.28";
    canvas.style.mixBlendMode    = "multiply";
    canvas.style.zIndex          = "200";

    // Insert into the Leaflet "overlayPane" so it sits above tiles but below markers
    const pane = map.getPane("overlayPane");
    if (pane) pane.appendChild(canvas);

    this._cvs = canvas;
    this._resize();
    this._draw();

    map.on("moveend zoomend resize", this._onMapChange, this);
    return this;
  }

  onRemove(map: L.Map): this {
    map.off("moveend zoomend resize", this._onMapChange, this);
    if (this._cvs && this._cvs.parentNode) {
      this._cvs.parentNode.removeChild(this._cvs);
    }
    this._cvs        = null;
    this._leafletMap = null;
    return this;
  }

  private _onMapChange = () => {
    this._resize();
    this._draw();
  };

  private _resize() {
    if (!this._cvs || !this._leafletMap) return;
    const size = this._leafletMap.getSize();
    this._cvs.width  = size.x;
    this._cvs.height = size.y;
    // Keep canvas aligned with the map's top-left corner
    const topLeft = this._leafletMap.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(this._cvs, topLeft);
  }

  private _draw() {
    if (!this._cvs || !this._leafletMap) return;
    const ctx  = this._cvs.getContext("2d");
    if (!ctx) return;

    const map  = this._leafletMap;
    const size = map.getSize();
    ctx.clearRect(0, 0, size.x, size.y);

    // Project the four corners of a representative cell to get pixel cell size
    // We compute pixel dimensions per node dynamically for accuracy at any zoom.
    for (const [lat, lng, slope] of gridData) {
      // Project cell corners to container pixels
      const sw = map.latLngToContainerPoint(L.latLng(lat - HALF_LAT, lng - HALF_LNG));
      const ne = map.latLngToContainerPoint(L.latLng(lat + HALF_LAT, lng + HALF_LNG));

      const x = Math.floor(Math.min(sw.x, ne.x));
      const y = Math.floor(Math.min(sw.y, ne.y));
      const w = Math.ceil(Math.abs(ne.x - sw.x)) + 1; // +1 to close sub-pixel gaps
      const h = Math.ceil(Math.abs(ne.y - sw.y)) + 1;

      // Skip cells entirely outside the viewport (fast cull)
      if (x + w < 0 || x > size.x || y + h < 0 || y > size.y) continue;

      ctx.fillStyle = slopeRgba(slope);
      ctx.fillRect(x, y, w, h);
    }
  }
}

// ── React wrapper component ───────────────────────────────────────────────────
export default function SlopeHeatmapLayer() {
  const map     = useMap();
  const layerRef = useRef<SlopeCanvasLayer | null>(null);

  useEffect(() => {
    if (!map) return;

    const layer = new SlopeCanvasLayer();
    layer.addTo(map);
    layerRef.current = layer;

    return () => {
      layer.remove();
      layerRef.current = null;
    };
  }, [map]);

  return null;
}
