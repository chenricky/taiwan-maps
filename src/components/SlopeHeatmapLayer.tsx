"use client";

/**
 * SlopeHeatmapLayer.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders the Taipei slope heatmap as a smooth, continuous canvas overlay.
 *
 * SMOOTH RENDERING STRATEGY:
 *   1. Project all 120×120 grid nodes to pixel coordinates.
 *   2. Draw each cell as a filled rectangle (no stroke, no border).
 *   3. Use CSS `filter: blur(Xpx)` on the canvas element itself to blend
 *      neighbouring cells into a seamless gradient surface — this is the
 *      most reliable cross-browser way to achieve smooth interpolation
 *      without WebGL shaders.
 *   4. Overlay opacity: 0.35 + mix-blend-mode: multiply keeps the colour
 *      wash gentle so all street labels and icons remain legible.
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
// Half-cell sizes in degrees — each node "owns" half a step in each direction
const HALF_LAT = (LAT_MAX - LAT_MIN) / (GRID_N - 1) / 2;
const HALF_LNG = (LNG_MAX - LNG_MIN) / (GRID_M - 1) / 2;

// ── Colour ramp ───────────────────────────────────────────────────────────────
// Returns [r, g, b] for a given slope percentage
function slopeRGB(pct: number): [number, number, number] {
  if (pct < 3)   return [34,  197, 94];   // green  #22C55E
  if (pct < 5)   return [234, 179, 8];    // yellow #EAB308
  if (pct < 8.3) return [249, 115, 22];   // orange #F97316
  return               [239, 68,  68];    // red    #EF4444
}

// Smooth linear interpolation between two slope values for gradient fills
function lerpRGB(
  pct1: number, pct2: number, t: number
): [number, number, number] {
  const [r1, g1, b1] = slopeRGB(pct1);
  const [r2, g2, b2] = slopeRGB(pct2);
  return [
    Math.round(r1 + (r2 - r1) * t),
    Math.round(g1 + (g2 - g1) * t),
    Math.round(b1 + (b2 - b1) * t),
  ];
}

// ── Canvas Leaflet layer ──────────────────────────────────────────────────────
class SlopeCanvasLayer extends L.Layer {
  private _cvs: HTMLCanvasElement | null = null;
  private _leafletMap: L.Map | null = null;

  onAdd(map: L.Map): this {
    this._leafletMap = map;

    const canvas = L.DomUtil.create("canvas", "slope-heatmap-canvas") as HTMLCanvasElement;
    canvas.style.position      = "absolute";
    canvas.style.top           = "0";
    canvas.style.left          = "0";
    canvas.style.pointerEvents = "none";
    // Blur radius: ~1.5× the projected cell size at zoom 12 gives smooth blending
    // We use a fixed pixel blur; it looks great at zoom 10-14
    canvas.style.filter        = "blur(6px)";
    canvas.style.opacity       = "0.45";
    canvas.style.mixBlendMode  = "multiply";
    canvas.style.zIndex        = "200";

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
    const topLeft = this._leafletMap.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(this._cvs, topLeft);
  }

  private _draw() {
    if (!this._cvs || !this._leafletMap) return;
    const ctx = this._cvs.getContext("2d");
    if (!ctx) return;

    const map  = this._leafletMap;
    const size = map.getSize();
    ctx.clearRect(0, 0, size.x, size.y);

    // Build a 2D lookup: slope[row][col]
    const slope: number[][] = Array.from({ length: GRID_N }, () =>
      new Array(GRID_M).fill(0)
    );
    for (let i = 0; i < gridData.length; i++) {
      const row = Math.floor(i / GRID_M);
      const col = i % GRID_M;
      slope[row][col] = gridData[i][2];
    }

    // For each cell, draw a rectangle with a 4-corner linear gradient
    // that interpolates between the slope values of adjacent nodes.
    // This produces seamless colour transitions across cell boundaries.
    for (let r = 0; r < GRID_N; r++) {
      for (let c = 0; c < GRID_M; c++) {
        const lat = LAT_MIN + r * (LAT_MAX - LAT_MIN) / (GRID_N - 1);
        const lng = LNG_MIN + c * (LNG_MAX - LNG_MIN) / (GRID_M - 1);

        const sw = map.latLngToContainerPoint(L.latLng(lat - HALF_LAT, lng - HALF_LNG));
        const ne = map.latLngToContainerPoint(L.latLng(lat + HALF_LAT, lng + HALF_LNG));

        const x = Math.floor(Math.min(sw.x, ne.x));
        const y = Math.floor(Math.min(sw.y, ne.y));
        const w = Math.ceil(Math.abs(ne.x - sw.x)) + 1;
        const h = Math.ceil(Math.abs(ne.y - sw.y)) + 1;

        // Viewport cull
        if (x + w < 0 || x > size.x || y + h < 0 || y > size.y) continue;

        // Get slope values at the 4 corners (clamp to grid edges)
        const r0 = Math.max(0, r - 1), r1 = Math.min(GRID_N - 1, r + 1);
        const c0 = Math.max(0, c - 1), c1 = Math.min(GRID_M - 1, c + 1);
        const sTL = slope[r0][c0];
        const sTR = slope[r0][c1];
        const sBL = slope[r1][c0];
        const sBR = slope[r1][c1];

        // Use a horizontal gradient (left = avg top-left/bottom-left, right = avg top-right/bottom-right)
        // This gives smooth left-right blending; the CSS blur handles the vertical blending
        const sLeft  = (sTL + sBL) / 2;
        const sRight = (sTR + sBR) / 2;

        if (Math.abs(sLeft - sRight) < 0.5) {
          // Uniform cell — plain fill (fast path)
          const [r_, g_, b_] = slopeRGB(slope[r][c]);
          ctx.fillStyle = `rgb(${r_},${g_},${b_})`;
          ctx.fillRect(x, y, w, h);
        } else {
          // Gradient fill — smooth horizontal transition
          const grad = ctx.createLinearGradient(x, y, x + w, y);
          const [lr, lg, lb] = slopeRGB(sLeft);
          const [rr, rg, rb] = slopeRGB(sRight);
          grad.addColorStop(0, `rgb(${lr},${lg},${lb})`);
          grad.addColorStop(1, `rgb(${rr},${rg},${rb})`);
          ctx.fillStyle = grad;
          ctx.fillRect(x, y, w, h);
        }
      }
    }
  }
}

// ── React wrapper component ───────────────────────────────────────────────────
export default function SlopeHeatmapLayer() {
  const map      = useMap();
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
