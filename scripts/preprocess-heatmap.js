/**
 * preprocess-heatmap.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates a high-density 120×120 slope grid heatmap for the greater Taipei
 * basin with bilinear smoothing to eliminate blocky mosaic artefacts.
 *
 * ANTI-FREEZE STRATEGY:
 *   Reuses the exact sum-of-Gaussians elevation model from preprocess-dsm.js.
 *   No binary file I/O, no network calls, no GDAL — runs in < 2 seconds.
 *
 * SMOOTHING PIPELINE:
 *   1. Compute raw slope at every node of a 120×120 mesh.
 *   2. Apply a 3×3 box-blur (mean filter) over the slope values to guarantee
 *      gradual, continuous transitions between neighbouring cells.
 *   3. Export the smoothed array — no dLat/dLng needed by the new canvas layer.
 *
 * OUTPUT: src/data/taipei_slope_grid.json
 *   Compact array of [lat, lng, slope_pct] triples — one per grid node.
 *   Target file size: well under 2 MB.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const fs   = require("fs");
const path = require("path");

// ── 1. Bounding box & grid resolution ────────────────────────────────────────
const LAT_MIN = 24.95;
const LAT_MAX = 25.20;
const LNG_MIN = 121.45;
const LNG_MAX = 121.65;
const GRID_N  = 120;   // rows (latitude)
const GRID_M  = 120;   // cols (longitude)

const LAT_STEP = (LAT_MAX - LAT_MIN) / (GRID_N - 1);
const LNG_STEP = (LNG_MAX - LNG_MIN) / (GRID_M - 1);

// ── 2. Elevation model (identical to preprocess-dsm.js) ──────────────────────
const ELEVATION_ANCHORS = [
  { lat: 25.185, lng: 121.530, elev: 1120, sLat: 0.04,  sLng: 0.04  },
  { lat: 25.175, lng: 121.510, elev:  900, sLat: 0.03,  sLng: 0.03  },
  { lat: 25.145, lng: 121.505, elev:  280, sLat: 0.025, sLng: 0.025 },
  { lat: 25.120, lng: 121.465, elev:  220, sLat: 0.03,  sLng: 0.03  },
  { lat: 25.085, lng: 121.600, elev:  180, sLat: 0.025, sLng: 0.025 },
  { lat: 25.055, lng: 121.620, elev:  140, sLat: 0.02,  sLng: 0.02  },
  { lat: 24.995, lng: 121.575, elev:  260, sLat: 0.03,  sLng: 0.03  },
  { lat: 24.975, lng: 121.545, elev:  120, sLat: 0.025, sLng: 0.025 },
  { lat: 24.970, lng: 121.590, elev:  320, sLat: 0.025, sLng: 0.025 },
  { lat: 25.105, lng: 121.530, elev:  160, sLat: 0.025, sLng: 0.025 },
];
const BASIN_BASELINE = 8;

function estimateElevation(lat, lng) {
  let elev = BASIN_BASELINE;
  for (const a of ELEVATION_ANCHORS) {
    const dLat = (lat - a.lat) / a.sLat;
    const dLng = (lng - a.lng) / a.sLng;
    elev += a.elev * Math.exp(-0.5 * (dLat * dLat + dLng * dLng));
  }
  return elev;
}

// ── 3. Haversine distance (metres) ────────────────────────────────────────────
const R_EARTH = 6371000;

function haversineMetres(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat  = toRad(lat2 - lat1);
  const dLng  = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.sqrt(a));
}

// ── 4. Slope → colour ramp ────────────────────────────────────────────────────
function slopeColor(pct) {
  if (pct < 3)   return "#22C55E";
  if (pct < 5)   return "#EAB308";
  if (pct < 8.3) return "#F97316";
  return              "#EF4444";
}

// ── 5. Build raw slope matrix ─────────────────────────────────────────────────
console.log(`\n🗺️  Building ${GRID_N}×${GRID_M} high-density slope grid for Taipei basin...\n`);

// Pre-compute all lat/lng node positions
const lats = Array.from({ length: GRID_N }, (_, r) => LAT_MIN + r * LAT_STEP);
const lngs = Array.from({ length: GRID_M }, (_, c) => LNG_MIN + c * LNG_STEP);

// Raw slope matrix [row][col]
const rawSlope = Array.from({ length: GRID_N }, () => new Float32Array(GRID_M));

// Use a small finite-difference step (half a cell) for gradient estimation
const dLat = LAT_STEP * 0.5;
const dLng = LNG_STEP * 0.5;

for (let r = 0; r < GRID_N; r++) {
  const lat = lats[r];
  for (let c = 0; c < GRID_M; c++) {
    const lng = lngs[c];

    const elev0 = estimateElevation(lat, lng);

    // North neighbour
    const elevN  = estimateElevation(lat + dLat, lng);
    const distN  = haversineMetres(lat, lng, lat + dLat, lng);
    const slopeN = distN > 0 ? Math.abs(elevN - elev0) / distN * 100 : 0;

    // East neighbour
    const elevE  = estimateElevation(lat, lng + dLng);
    const distE  = haversineMetres(lat, lng, lat, lng + dLng);
    const slopeE = distE > 0 ? Math.abs(elevE - elev0) / distE * 100 : 0;

    rawSlope[r][c] = Math.sqrt(slopeN ** 2 + slopeE ** 2);
  }

  if ((r + 1) % 20 === 0) {
    process.stdout.write(`  Row ${String(r + 1).padStart(3)}/${GRID_N} done\n`);
  }
}

// ── 6. Bilinear / box-blur smoothing (3×3 mean filter, 2 passes) ─────────────
console.log("\n🔄  Applying 3×3 box-blur smoothing (2 passes)...");

function boxBlur(src) {
  const dst = Array.from({ length: GRID_N }, () => new Float32Array(GRID_M));
  for (let r = 0; r < GRID_N; r++) {
    for (let c = 0; c < GRID_M; c++) {
      let sum = 0, count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < GRID_N && nc >= 0 && nc < GRID_M) {
            sum += src[nr][nc];
            count++;
          }
        }
      }
      dst[r][c] = sum / count;
    }
  }
  return dst;
}

// Two passes of box-blur for a smooth Gaussian-like result
let smoothed = boxBlur(rawSlope);
smoothed     = boxBlur(smoothed);

console.log("✅  Smoothing complete.\n");

// ── 7. Assemble output array ──────────────────────────────────────────────────
const grid = [];

for (let r = 0; r < GRID_N; r++) {
  for (let c = 0; c < GRID_M; c++) {
    const slopePct = smoothed[r][c];
    const rounded  = Math.round(slopePct * 10) / 10;
    grid.push([
      Math.round(lats[r] * 100000) / 100000,   // lat
      Math.round(lngs[c] * 100000) / 100000,   // lng
      rounded,                                   // slope_pct
    ]);
  }
}

// ── 8. Summary ────────────────────────────────────────────────────────────────
const counts = { green: 0, yellow: 0, orange: 0, red: 0 };
for (const [,, s] of grid) {
  if      (s < 3)   counts.green++;
  else if (s < 5)   counts.yellow++;
  else if (s < 8.3) counts.orange++;
  else              counts.red++;
}

console.log(`📊 Grid Summary (${grid.length} nodes):
   🟢 平坦安全  (0–3%):    ${counts.green} nodes
   🟡 微幅傾斜  (3–5%):    ${counts.yellow} nodes
   🟠 陡坡注意  (5–8.3%):  ${counts.orange} nodes
   🔴 極陡坡    (>8.3%):   ${counts.red} nodes
`);

// ── 9. Write output ───────────────────────────────────────────────────────────
const OUTPUT = path.resolve(__dirname, "../src/data/taipei_slope_grid.json");

// Compact JSON: one triple per line for readability, minimal whitespace
const lines = grid.map((t) => JSON.stringify(t));
const json  = "[\n" + lines.join(",\n") + "\n]";

fs.writeFileSync(OUTPUT, json, "utf-8");

const sizeKB = (Buffer.byteLength(json, "utf-8") / 1024).toFixed(1);
console.log(`✅ Wrote ${grid.length} nodes to: ${OUTPUT}`);
console.log(`   File size: ${sizeKB} KB (limit: 2048 KB)\n`);

if (parseFloat(sizeKB) > 2048) {
  console.warn("⚠️  WARNING: output exceeds 2 MB mobile safety limit!");
}
