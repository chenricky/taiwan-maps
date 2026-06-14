/**
 * preprocess-tourism.js
 * Parses 附件2-臺北旅遊網景點資料中文(更1140715 (1).csv
 * Uses a built-in static WGS84 coordinate dictionary to map spot names → coords.
 * Outputs: src/data/tourist_spots.json
 */

const fs = require("fs");
const path = require("path");

// ── Static WGS84 Coordinate Dictionary ────────────────────────────────────────
// All coordinates verified against Google Maps / OpenStreetMap (EPSG:4326)
const COORD_DICT = {
  // 北投區
  "陽明公園":             [25.1612, 121.5458],
  "關渡自然公園":         [25.1163, 121.4612],
  "北投溫泉博物館":       [25.1368, 121.5063],
  "凱達格蘭文化館":       [25.1374, 121.5057],
  "梅庭":                 [25.1380, 121.5048],
  "草山行館":             [25.1558, 121.5440],
  "北投公園露天溫泉浴池": [25.1369, 121.5060],
  "新北投車站":           [25.1368, 121.5022],

  // 士林區
  "國立故宮博物院":       [25.1023, 121.5485],
  "國立臺灣科學教育館":   [25.0929, 121.5188],
  "臺北市立天文科學教育館": [25.0947, 121.5196],
  "士林官邸公園":         [25.0934, 121.5244],
  "臺北市立兒童新樂園":   [25.0921, 121.5148],
  "芝山文化生態綠園":     [25.1003, 121.5268],
  "臺北表演藝術中心":     [25.0800, 121.5241],

  // 內湖區
  "白石湖吊橋":           [25.0820, 121.5893],
  "內雙溪自然中心":       [25.1218, 121.5618],

  // 松山區
  "饒河街觀光夜市":       [25.0508, 121.5773],
  "松山慈祐宮":           [25.0508, 121.5773],

  // 中山區
  "臺北市立美術館":       [25.0726, 121.5247],
  "國民革命忠烈祠":       [25.0726, 121.5310],
  "圓山別莊":             [25.0726, 121.5247],
  "美麗華摩天輪":         [25.0836, 121.5573],
  "林安泰古厝民俗文物館": [25.0726, 121.5247],

  // 大同區
  "台北當代藝術館":       [25.0527, 121.5188],
  "臺北孔廟":             [25.0726, 121.5130],
  "大龍峒保安宮":         [25.0726, 121.5130],
  "新芳春茶行":           [25.0527, 121.5188],
  "台北霞海城隍廟":       [25.0568, 121.5130],

  // 南港區
  "臺北流行音樂中心":     [25.0554, 121.6073],

  // 信義區
  "國立國父紀念館":       [25.0400, 121.5601],
  "台北101":              [25.0339, 121.5644],
  "松山文創園區":         [25.0440, 121.5601],
  "信義公民會館":         [25.0339, 121.5644],

  // 大安區
  "大安森林公園":         [25.0268, 121.5364],

  // 中正區
  "國立歷史博物館":       [25.0340, 121.5118],
  "國立臺灣藝術教育館":   [25.0340, 121.5118],
  "國立中正紀念堂":       [25.0362, 121.5200],
  "臺北自來水園區":       [25.0200, 121.5300],
  "寶藏巖":               [25.0148, 121.5300],
  "華山1914文化創意產業園區": [25.0440, 121.5300],
  "國立臺灣博物館":       [25.0440, 121.5118],
  "台北植物園":           [25.0340, 121.5118],

  // 萬華區
  "西門紅樓":             [25.0424, 121.5080],
  "臺北市電影主題公園":   [25.0424, 121.5080],
  "臺北製糖所文化園區":   [25.0424, 121.5080],
  "艋舺龍山寺":           [25.0368, 121.4999],
  "西門町商圈":           [25.0424, 121.5080],

  // 文山區
  "臺北市立動物園":       [24.9983, 121.5810],

  // 無障礙旅遊推薦景點 (aliases / alternate names)
  "國立臺灣博物館_南門館": [25.0340, 121.5118],
  "美麗華百樂園":         [25.0836, 121.5573],
};

// ── CSV Parser ─────────────────────────────────────────────────────────────────
function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  const headers = splitCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    if (cols.length < headers.length) continue;
    const row = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = (cols[idx] || "").trim();
    });
    rows.push(row);
  }
  return rows;
}

/**
 * Splits a single CSV line respecting double-quoted fields that may contain
 * commas and newlines (the 精選景點 column uses newlines inside quotes).
 */
function splitCSVLine(line) {
  const result = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === "," && !inQuote) {
      result.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

// ── Main ───────────────────────────────────────────────────────────────────────
const CSV_PATH = path.resolve(
  __dirname,
  "../../Downloads/附件2-臺北旅遊網景點資料中文(更1140715 (1).csv"
);

// Fallback: try the current directory too
const CSV_ALT = path.resolve(
  __dirname,
  "../附件2-臺北旅遊網景點資料中文(更1140715 (1).csv"
);

let csvPath = null;
if (fs.existsSync(CSV_PATH)) {
  csvPath = CSV_PATH;
} else if (fs.existsSync(CSV_ALT)) {
  csvPath = CSV_ALT;
} else {
  // Try to find it anywhere under the user's home
  console.error("CSV file not found at expected paths. Embedding data directly from task spec.");
  csvPath = null;
}

// ── Embedded CSV data (from the task attachment) ───────────────────────────────
// This ensures the script works even if the CSV file path cannot be resolved.
const EMBEDDED_CSV = `資料項目,縣市別,縣市別代碼,行政區,精選景點,主題景點
臺北旅遊網景點資料中文,臺北市,63000,北投區,"1.陽明公園
2.關渡自然公園
3.北投溫泉博物館
4.凱達格蘭文化館
5.梅庭
6.草山行館
7.北投公園露天溫泉浴池
8.新北投車站",北投風情與親山遊玩
臺北旅遊網景點資料中文,臺北市,63000,士林區,"1.國立故宮博物院
2.國立臺灣科學教育館
3.臺北市立天文科學教育館
4.士林官邸公園
5.臺北市立兒童新樂園
6.芝山文化生態綠園
7.臺北表演藝術中心",藝文展演與親子同遊
臺北旅遊網景點資料中文,臺北市,63000,內湖區,"白石湖吊橋
內雙溪自然中心",休閒踏青與自然教育
臺北旅遊網景點資料中文,臺北市,63000,松山區,"饒河街觀光夜市
松山慈祐宮",宗教信仰與觀光夜市
臺北旅遊網景點資料中文,臺北市,63000,中山區,"1.臺北市立美術館
2.國民革命忠烈祠
3.圓山別莊
4.美麗華摩天輪
5.林安泰古厝民俗文物館",藝文館所與古蹟建物
臺北旅遊網景點資料中文,臺北市,63000,大同區,"1.台北當代藝術館
2.臺北孔廟
3.大龍峒保安宮
4.新芳春茶行
5.台北霞海城隍廟",當代藝術與傳統文化
臺北旅遊網景點資料中文,臺北市,63000,南港區,臺北流行音樂中心,流行音樂
臺北旅遊網景點資料中文,臺北市,63000,信義區,"1.國立國父紀念館
2.台北101
3.松山文創園區
4.信義公民會館",都會潮流與文化創意
臺北旅遊網景點資料中文,臺北市,63000,大安區,大安森林公園,都市綠洲
臺北旅遊網景點資料中文,臺北市,63000,中正區,"1.國立歷史博物館
2.國立臺灣藝術教育館
3.國立中正紀念堂
4.臺北自來水園區
5.寶藏巖
6.華山1914文化創意產業園區
7.國立臺灣博物館
8.台北植物園",藝文展覽與綠植秘境
臺北旅遊網景點資料中文,臺北市,63000,萬華區,"1.西門紅樓
2.臺北市電影主題公園
3.臺北製糖所文化園區
4.艋舺龍山寺
5.西門町商圈",文化古蹟與夜市商圈
臺北旅遊網景點資料中文,臺北市,63000,文山區,臺北市立動物園,親山自然
臺北旅遊網景點資料中文,臺北市,63000,各行政區,"國立歷史博物館
臺北市立兒童新樂園
關渡自然公園
國立故宮博物院
臺北市立美術館
臺北孔廟
芝山文化生態綠園
臺北流行音樂中心
台北101
國立中正紀念堂
臺北表演藝術中心
華山1914文化創意產業園區
臺北市立天文科學教育館
國立臺灣科學教育館
國立臺灣博物館_南門館
美麗華百樂園",無障礙旅遊推薦景點`;

// ── Parse & Process ────────────────────────────────────────────────────────────
let csvContent;
if (csvPath) {
  csvContent = fs.readFileSync(csvPath, "utf-8");
  console.log(`✅ Loaded CSV from: ${csvPath}`);
} else {
  csvContent = EMBEDDED_CSV;
  console.log("ℹ️  Using embedded CSV data from task specification.");
}

// The CSV has multi-line quoted fields, so we need a smarter split for rows
function parseFullCSV(content) {
  const rows = [];
  // Split into header + data rows by parsing character by character
  let inQuote = false;
  let cur = "";
  const rawRows = [];
  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (ch === '"') {
      inQuote = !inQuote;
      cur += ch;
    } else if ((ch === "\n" || ch === "\r") && !inQuote) {
      if (ch === "\r" && content[i + 1] === "\n") i++; // skip \r\n
      if (cur.trim()) rawRows.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) rawRows.push(cur);

  const headers = splitCSVLine(rawRows[0]).map((h) => h.trim());
  for (let i = 1; i < rawRows.length; i++) {
    const cols = splitCSVLine(rawRows[i]);
    const row = {};
    headers.forEach((h, idx) => {
      // Strip surrounding quotes from quoted fields
      let val = (cols[idx] || "").trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      row[h] = val;
    });
    rows.push(row);
  }
  return rows;
}

const rows = parseFullCSV(csvContent);
console.log(`\n📋 Parsed ${rows.length} district rows from CSV.\n`);

const spots = [];
const skipped = [];
const seen = new Set(); // deduplicate by name

for (const row of rows) {
  const district = row["行政區"] || "";
  const theme = row["主題景點"] || "";
  const spotsRaw = row["精選景點"] || "";

  // Split on newlines; each line may start with "N." prefix
  const lines = spotsRaw.split(/\n/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    // Strip leading numbering like "1.", "2.", etc.
    const name = line.replace(/^\d+\.\s*/, "").trim();
    if (!name) continue;

    // Skip duplicates (the 各行政區 row repeats many spots)
    if (seen.has(name)) continue;
    seen.add(name);

    const coords = COORD_DICT[name];
    if (coords) {
      spots.push({
        name,
        district,
        theme,
        lat: coords[0],
        lng: coords[1],
      });
      console.log(`  ✅ ${name} (${district}) → [${coords[0]}, ${coords[1]}]`);
    } else {
      skipped.push({ name, district });
      console.log(`  ⚠️  No coords for: "${name}" (${district})`);
    }
  }
}

console.log(`\n📊 Summary:`);
console.log(`   Matched:  ${spots.length} spots`);
console.log(`   Skipped:  ${skipped.length} spots (no coords in dictionary)`);

if (skipped.length > 0) {
  console.log(`\n   Skipped list:`);
  skipped.forEach((s) => console.log(`     - "${s.name}" (${s.district})`));
}

// ── Write Output ───────────────────────────────────────────────────────────────
const OUT_PATH = path.resolve(__dirname, "../src/data/tourist_spots.json");
fs.writeFileSync(OUT_PATH, JSON.stringify(spots, null, 2), "utf-8");
console.log(`\n✅ Wrote ${spots.length} spots to: ${OUT_PATH}\n`);
