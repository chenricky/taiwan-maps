/**
 * build-bus-transfers.mjs
 * Pre-processes 車站出口公車資訊.csv (Big5 encoded) and joins with mrt_facilities.json
 * to produce src/data/mrt_bus_transfers.json
 *
 * Uses Hash Map O(N) strategy for high-performance join.
 * Run: node taiwan-maps/scripts/build-bus-transfers.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── 1. Read the CSV as raw bytes and decode Big5 ──────────────────────────────
const csvPath = path.resolve('C:/Users/chenr/Downloads/車站出口公車資訊.csv');

// Decode Big5 using TextDecoder (built into Node.js v18+)
const rawBuffer = fs.readFileSync(csvPath);

let csvText;
try {
  // Try Big5 first (most likely encoding for Taiwan government data)
  const decoder = new TextDecoder('big5');
  csvText = decoder.decode(rawBuffer);
  // Verify it decoded correctly by checking for Chinese characters
  if (!/[\u4e00-\u9fff]/.test(csvText.slice(0, 200))) {
    throw new Error('Big5 decode produced no Chinese characters');
  }
} catch (e1) {
  try {
    // Try UTF-8
    csvText = rawBuffer.toString('utf8');
    if (!/[\u4e00-\u9fff]/.test(csvText.slice(0, 200))) {
      throw new Error('UTF-8 decode produced no Chinese characters');
    }
  } catch (e2) {
    // Fallback: try cp950 (Windows Traditional Chinese)
    const decoder = new TextDecoder('windows-1252');
    csvText = decoder.decode(rawBuffer);
  }
}

// ── 2. Parse CSV into Hash Map (O(N) single pass) ─────────────────────────────
const lines = csvText.split(/\r?\n/).filter(l => l.trim());
// header: 序號,車站,出口,公車名稱,最後更新日期
const header = lines[0].split(',');
console.log('CSV header:', header);
console.log('CSV total data rows:', lines.length - 1);

// Hash Map: key = "station|exit" → Set of unique bus names
const busMap = new Map();

for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split(',');
  if (cols.length < 4) continue;
  // cols: [序號, 車站, 出口, 公車名稱, 最後更新日期]
  const station = cols[1]?.trim();
  const exit_ = cols[2]?.trim();
  const busName = cols[3]?.trim();
  if (!station || !exit_ || !busName) continue;
  const key = `${station}|${exit_}`;
  if (!busMap.has(key)) busMap.set(key, new Set());
  busMap.get(key).add(busName);
}

console.log(`Unique station|exit combos in CSV: ${busMap.size}`);
// Show sample bus keys to verify encoding
const busKeys = [...busMap.keys()].slice(0, 5);
console.log('Sample bus keys (should be Chinese):', busKeys);

// ── 3. Load facilities JSON ───────────────────────────────────────────────────
const facilitiesPath = path.join(ROOT, 'src/data/mrt_facilities.json');
const facilities = JSON.parse(fs.readFileSync(facilitiesPath, 'utf8'));
console.log(`Facilities loaded: ${facilities.length}`);

// ── 4. Build coordinate Hash Map: "stationName|exit" → {lat, lng} ─────────────
// Facility name patterns:
//   "動物園站出口電梯1"       → station = "動物園", exit = "出口1"
//   "木柵站出口無障礙坡道"    → station = "木柵",   exit = "單一出口"
//   "台北101/世貿站出口電梯1" → station = "台北101/世貿"
function extractStationName(facilityName) {
  const match = facilityName.match(/^(.+?)站(?:出口|單一出口)/);
  if (match) return match[1];
  return facilityName.replace(/站$/, '');
}

const coordMap = new Map(); // key: "station|exit" → {lat, lng}

for (const fac of facilities) {
  const stationName = extractStationName(fac.name);
  const exitKey = fac.exit; // e.g. "出口1", "單一出口"
  const key = `${stationName}|${exitKey}`;
  if (!coordMap.has(key)) {
    coordMap.set(key, { lat: fac.lat, lng: fac.lng });
  }
}

console.log(`Coord map entries: ${coordMap.size}`);
const coordKeys = [...coordMap.keys()].slice(0, 5);
console.log('Sample coord keys:', coordKeys);

// ── 5. O(N) Hash Map Join ─────────────────────────────────────────────────────
const results = [];

for (const [key, busSet] of busMap.entries()) {
  const coords = coordMap.get(key);
  if (!coords) continue;

  const pipeIdx = key.indexOf('|');
  const station = key.slice(0, pipeIdx);
  const exit_ = key.slice(pipeIdx + 1);

  results.push({
    station,
    exit: exit_,
    lat: coords.lat,
    lng: coords.lng,
    buses: [...busSet].sort(),
  });
}

// Sort by station name for readability
results.sort((a, b) => a.station.localeCompare(b.station, 'zh-TW'));

console.log(`Generated ${results.length} bus transfer points`);

// ── 6. Write output ───────────────────────────────────────────────────────────
const outPath = path.join(ROOT, 'src/data/mrt_bus_transfers.json');
fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');
console.log(`Written to src/data/mrt_bus_transfers.json`);

// Show unmatched keys for debugging
const unmatched = [...busMap.keys()].filter(k => !coordMap.has(k));
console.log(`\nUnmatched bus keys (no GPS): ${unmatched.length}`);
if (unmatched.length > 0 && unmatched.length <= 30) {
  unmatched.forEach(k => console.log('  UNMATCHED:', k));
} else if (unmatched.length > 30) {
  unmatched.slice(0, 10).forEach(k => console.log('  UNMATCHED:', k));
  console.log(`  ... and ${unmatched.length - 10} more`);
}

// Show matched sample
if (results.length > 0) {
  console.log('\nSample output:');
  console.log(JSON.stringify(results[0], null, 2));
}
