/**
 * Convert MRT Routes GeoJSON from TWD97/TM2 (EPSG:3826) to WGS84 (EPSG:4326)
 * 
 * TWD97 TM2 (EPSG:3826) parameters:
 *   - Central meridian: 121°E
 *   - Scale factor: 0.9999
 *   - False Easting: 250000 m
 *   - False Northing: 0 m
 *   - Ellipsoid: GRS80
 * 
 * We use the Transverse Mercator inverse projection formula.
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// GRS80 ellipsoid parameters
const a = 6378137.0;          // semi-major axis
const f = 1 / 298.257222101;  // flattening
const b = a * (1 - f);        // semi-minor axis
const e2 = 2 * f - f * f;     // eccentricity squared
const e = Math.sqrt(e2);

// TM2 projection parameters for EPSG:3826
const k0 = 0.9999;            // scale factor
const lon0 = 121 * Math.PI / 180; // central meridian in radians
const FE = 250000;             // false easting
const FN = 0;                  // false northing

/**
 * Convert TWD97 TM2 (E, N) in meters to WGS84 (lon, lat) in degrees
 */
function twd97ToWgs84(E, N) {
  // Remove false easting/northing
  const x = E - FE;
  const y = N - FN;

  // Meridional arc
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  
  const M = y / k0;
  const mu = M / (a * (1 - e2/4 - 3*e2*e2/64 - 5*e2*e2*e2/256));

  const phi1 = mu
    + (3*e1/2 - 27*e1*e1*e1/32) * Math.sin(2*mu)
    + (21*e1*e1/16 - 55*e1*e1*e1*e1/32) * Math.sin(4*mu)
    + (151*e1*e1*e1/96) * Math.sin(6*mu)
    + (1097*e1*e1*e1*e1/512) * Math.sin(8*mu);

  const N1 = a / Math.sqrt(1 - e2 * Math.sin(phi1) * Math.sin(phi1));
  const T1 = Math.tan(phi1) * Math.tan(phi1);
  const C1 = e2 / (1 - e2) * Math.cos(phi1) * Math.cos(phi1);
  const R1 = a * (1 - e2) / Math.pow(1 - e2 * Math.sin(phi1) * Math.sin(phi1), 1.5);
  const D = x / (N1 * k0);

  const lat = phi1
    - (N1 * Math.tan(phi1) / R1) * (
        D*D/2
      - (5 + 3*T1 + 10*C1 - 4*C1*C1 - 9*e2/(1-e2)) * D*D*D*D/24
      + (61 + 90*T1 + 298*C1 + 45*T1*T1 - 252*e2/(1-e2) - 3*C1*C1) * D*D*D*D*D*D/720
    );

  const lon = lon0 + (
      D
    - (1 + 2*T1 + C1) * D*D*D/6
    + (5 - 2*C1 + 28*T1 - 3*C1*C1 + 8*e2/(1-e2) + 24*T1*T1) * D*D*D*D*D/120
  ) / Math.cos(phi1);

  return [lon * 180 / Math.PI, lat * 180 / Math.PI];
}

// Route name to official Taipei MRT color mapping
const ROUTE_COLORS = {
  '淡水線': '#e3002c',      // Red (Tamsui-Xinyi)
  '信義線': '#e3002c',      // Red (Tamsui-Xinyi)
  '小南門線': '#e3002c',    // Red branch
  '新店線': '#008659',      // Green (Songshan-Xindian)
  '松山線': '#008659',      // Green (Songshan-Xindian)
  '中和線': '#f8b61c',      // Yellow/Orange (Zhonghe-Xinlu)
  '新莊線': '#f8b61c',      // Orange (Zhonghe-Xinlu)
  '蘆洲線': '#f8b61c',      // Orange (Zhonghe-Xinlu)
  '板橋線': '#0070bd',      // Blue (Bannan)
  '南港線': '#0070bd',      // Blue (Bannan)
  '木柵線': '#c48a00',      // Brown (Wenhu)
  '內湖線': '#c48a00',      // Brown (Wenhu)
  '碧潭支線': '#008659',    // Green branch
  '環狀線': '#ffdd00',      // Yellow (Circular)
};

// Load the source GeoJSON
const srcPath = join(__dirname, '../../Downloads/TpeMRTRoutes_TWD97_臺北都會區大眾捷運系統路網圖-121208.json');
let raw;
try {
  raw = readFileSync(srcPath, 'utf-8');
} catch (e) {
  // Try alternate path
  const altPath = 'C:/Users/chenr/Downloads/TpeMRTRoutes_TWD97_臺北都會區大眾捷運系統路網圖-121208.json';
  raw = readFileSync(altPath, 'utf-8');
}

const geojson = JSON.parse(raw);

// Convert all features
const converted = geojson.features.map(feature => {
  const routeName = feature.properties.RouteName;
  const color = ROUTE_COLORS[routeName] || '#666666';
  
  let convertedGeometry;
  
  if (feature.geometry.type === 'LineString') {
    const coords = feature.geometry.coordinates.map(([e, n]) => {
      const [lon, lat] = twd97ToWgs84(e, n);
      return [lat, lon]; // Leaflet uses [lat, lng]
    });
    convertedGeometry = { type: 'LineString', coordinates: coords };
  } else if (feature.geometry.type === 'MultiLineString') {
    const lines = feature.geometry.coordinates.map(line =>
      line.map(([e, n]) => {
        const [lon, lat] = twd97ToWgs84(e, n);
        return [lat, lon];
      })
    );
    convertedGeometry = { type: 'MultiLineString', coordinates: lines };
  }
  
  return {
    id: feature.id,
    routeName,
    color,
    geometry: convertedGeometry,
  };
});

// Validate: check first coordinate of first feature is in Taipei area
const first = converted[0];
const firstCoord = first.geometry.type === 'LineString' 
  ? first.geometry.coordinates[0]
  : first.geometry.coordinates[0][0];
console.log(`First coord (lat, lng): ${firstCoord[0].toFixed(4)}, ${firstCoord[1].toFixed(4)}`);
console.log(`Expected: ~25.xx, ~121.xx (Taipei)`);
console.log(`Routes converted: ${converted.length}`);
converted.forEach(f => console.log(`  FID ${f.id}: ${f.routeName} (${f.color})`));

// Save output
const outPath = join(__dirname, '../src/data/mrt_routes.json');
writeFileSync(outPath, JSON.stringify(converted, null, 2), 'utf-8');
console.log(`\n✅ Saved to ${outPath}`);
