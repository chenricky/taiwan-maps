/**
 * Verify and geocode friendly toilet coordinates using Nominatim (OSM).
 * Outputs corrected friendly_toilets.json with accurate WGS84 coordinates.
 * 
 * All addresses are in Taipei, Taiwan.
 * Nominatim returns WGS84 (EPSG:4326) directly — no TWD97 conversion needed
 * when using OSM geocoding. The conversion note in the task applies only if
 * raw spatial data from Taiwan government GIS (which uses TWD97/TM2) is used.
 */

import { writeFileSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Raw CSV data parsed manually (UTF-8 from the attached file)
const rawEntries = [
  { id: 1,  nightMarket: "寧夏夜市",      name: "鬍鬚張美食文化館",                    address: "臺北市大同區寧夏路54號",                openTime: "10:00", closeTime: "01:30", closedDay: "無" },
  { id: 2,  nightMarket: "寧夏夜市",      name: "寧夏夜市觀光協會",                    address: "臺北市大同區寧夏路58號2樓",             openTime: "17:00", closeTime: "22:30", closedDay: "不定時" },
  { id: 3,  nightMarket: "寧夏夜市",      name: "*統一超商(7-11):鑫寧門市",            address: "臺北市大同區民生西路214號",             openTime: "00:00", closeTime: "23:59", closedDay: "無" },
  { id: 4,  nightMarket: "寧夏夜市",      name: "*雙連市場",                           address: "臺北市大同區民生西路198號",             openTime: "00:00", closeTime: "23:59", closedDay: "無" },
  { id: 5,  nightMarket: "延三夜市",      name: "延三海鮮炭烤",                        address: "臺北市大同區延平北路三段32之2號",       openTime: "18:00", closeTime: "23:59", closedDay: "不定時" },
  { id: 6,  nightMarket: "延三夜市",      name: "延三新營人沙茶牛肉",                  address: "臺北市大同區延平北路三段80號",          openTime: "18:00", closeTime: "23:59", closedDay: "星期一" },
  { id: 7,  nightMarket: "延三夜市",      name: "三重知高飯",                          address: "臺北市大同區延平北路三段29號",          openTime: "10:30", closeTime: "21:00", closedDay: "每月二、四週星期五" },
  { id: 8,  nightMarket: "大龍夜市",      name: "台南碗仔麵",                          address: "台北市大龍街312號",                    openTime: "18:00", closeTime: "23:00", closedDay: "星期一" },
  { id: 9,  nightMarket: "饒河街夜市",    name: "夾后娃娃屋",                          address: "臺北市松山區饒河街51號",               openTime: "17:00", closeTime: "02:00", closedDay: "無" },
  { id: 10, nightMarket: "饒河街夜市",    name: "萌夾",                                address: "臺北市松山區饒河街167號",              openTime: "00:00", closeTime: "23:59", closedDay: "無" },
  { id: 11, nightMarket: "饒河街夜市",    name: "優品娃娃商行",                        address: "臺北市松山區饒河街133號",              openTime: "11:00", closeTime: "23:59", closedDay: "星期一" },
  { id: 12, nightMarket: "饒河街夜市",    name: "*統一超商(7-11):松禾門市",            address: "臺北市松山區塔悠路31號",               openTime: "00:00", closeTime: "23:59", closedDay: "無" },
  { id: 13, nightMarket: "華西街夜市",    name: "華西街商圈區協會",                    address: "臺北市萬華區華西街28之3號2樓",         openTime: "12:00", closeTime: "23:59", closedDay: "無" },
  { id: 14, nightMarket: "梧州街夜市",    name: "梧州街臨時攤販集中場自治會",          address: "臺北市萬華區華西街40巷3號",            openTime: "16:00", closeTime: "23:59", closedDay: "無" },
  { id: 15, nightMarket: "廣州街夜市",    name: "廣州街攤販臨時集中場自治會",          address: "臺北市萬華區廣州街253巷25號1樓",       openTime: "17:00", closeTime: "23:59", closedDay: "無" },
  { id: 16, nightMarket: "廣州街夜市",    name: "大東牛排館",                          address: "臺北市萬華區廣州街220號1樓",           openTime: "16:30", closeTime: "23:00", closedDay: "不固定" },
  { id: 17, nightMarket: "西昌街夜市",    name: "旺寶彩券行",                          address: "臺北市萬華區廣州街138號",              openTime: "09:00", closeTime: "22:00", closedDay: "無" },
  { id: 18, nightMarket: "西昌街夜市",    name: "*龍山寺地下街",                       address: "臺北市萬華區西園路一段145號B1",        openTime: "11:00", closeTime: "21:30", closedDay: "無" },
  { id: 19, nightMarket: "南機場夜市",    name: "臭老闆臭豆腐店",                      address: "臺北市中正區中華路二段309巷46號",      openTime: "17:00", closeTime: "23:00", closedDay: "星期四" },
  { id: 20, nightMarket: "南機場夜市",    name: "口口品麻辣臭豆腐(南機場店)",          address: "臺北市中正區中華路二段309巷22號",      openTime: "17:00", closeTime: "01:00", closedDay: "無" },
  { id: 21, nightMarket: "南機場夜市",    name: "汪派沙茶羊肉",                        address: "臺北市中正區中華路二段311巷18號",      openTime: "16:30", closeTime: "23:59", closedDay: "無" },
  { id: 22, nightMarket: "南機場夜市",    name: "南機場臨時攤販集中場自治會",          address: "臺北市中正區中華路二段313巷30號",      openTime: "00:00", closeTime: "23:59", closedDay: "無" },
  { id: 23, nightMarket: "公館夜市",      name: "*水源市場",                           address: "臺北市中正區羅斯福路四段92號",         openTime: "07:00", closeTime: "20:00", closedDay: "星期一" },
  { id: 24, nightMarket: "雙城街夜市",    name: "晴光臨時攤販集中場自治會",            address: "臺北市中山區農安街2巷5弄底",          openTime: "00:00", closeTime: "23:59", closedDay: "無" },
  { id: 25, nightMarket: "雙城街夜市",    name: "果實咖啡堂",                          address: "臺北市中山區雙城街17巷7號",           openTime: "12:00", closeTime: "23:00", closedDay: "無" },
  { id: 26, nightMarket: "雙城街夜市",    name: "豐味亭小吃店",                        address: "臺北市中山區雙城街3巷2號",            openTime: "11:30", closeTime: "20:30", closedDay: "星期二" },
  { id: 27, nightMarket: "雙城街夜市",    name: "*統一超商(7-11):新晴光門市",          address: "臺北市中山區雙城街30號",              openTime: "00:00", closeTime: "23:59", closedDay: "無" },
  { id: 28, nightMarket: "雙城街夜市",    name: "*晴光臨時攤販集中場",                 address: "臺北市中山區雙城街12巷6號旁",         openTime: "09:00", closeTime: "20:00", closedDay: "無" },
  { id: 29, nightMarket: "遼寧街夜市",    name: "有有1969",                            address: "臺北市中山區遼寧街48號1樓",           openTime: "10:00", closeTime: "22:00", closedDay: "星期日" },
  { id: 30, nightMarket: "民族東路410巷", name: "*第二果菜批發市場",                   address: "臺北市中山區民族東路336號",           openTime: "04:00", closeTime: "12:00", closedDay: "星期一" },
  { id: 31, nightMarket: "民族東路410巷", name: "*民族魚市場",                         address: "臺北市中山區民族東路410巷2弄20號",    openTime: "08:00", closeTime: "23:00", closedDay: "無" },
  { id: 32, nightMarket: "臨江街夜市",    name: "久祥鞋店",                            address: "臺北市大安區臨江街102之2號",          openTime: "17:00", closeTime: "23:59", closedDay: "無" },
  { id: 33, nightMarket: "臨江街夜市",    name: "七二商行",                            address: "臺北市大安區臨江街72號",              openTime: "07:00", closeTime: "01:00", closedDay: "無" },
  { id: 34, nightMarket: "景美夜市",      name: "台灣吉野家股份有限公司景美分公司",    address: "臺北市文山區景文街99號",              openTime: "00:00", closeTime: "23:59", closedDay: "無" },
  { id: 35, nightMarket: "士林夜市",      name: "瑞成棉被店",                          address: "臺北市士林區大東路45號",              openTime: "11:00", closeTime: "23:30", closedDay: "不定時" },
  { id: 36, nightMarket: "士林夜市",      name: "ISPO+士林旗艦店",                     address: "臺北市士林區基河路130號2樓",          openTime: "14:00", closeTime: "22:00", closedDay: "無" },
  { id: 37, nightMarket: "士林夜市",      name: "臺北市農會陽明堆集場",                address: "臺北市士林區大東路15-12號前",         openTime: "10:00", closeTime: "22:00", closedDay: "星期一" },
  { id: 38, nightMarket: "士林夜市",      name: "台北市士林夜市商圈聯合會",            address: "臺北市士林區大西路6號1樓",            openTime: "17:00", closeTime: "23:00", closedDay: "除夕" },
  { id: 39, nightMarket: "士林夜市",      name: "*統一超商(7-11):文林門市",            address: "臺北市士林區大北路14號",              openTime: "00:00", closeTime: "23:59", closedDay: "無" },
  { id: 40, nightMarket: "士林夜市",      name: "*士林市場",                           address: "臺北市士林區基河路101號",             openTime: "00:00", closeTime: "23:59", closedDay: "無" },
  { id: 41, nightMarket: "福華廣場",      name: "福華廣場攤販集中場",                  address: "臺北市士林區通河街323之1號",          openTime: "07:00", closeTime: "14:00", closedDay: "星期一" },
  { id: 42, nightMarket: "石牌商城",      name: "大嘴巴牛排",                          address: "臺北市北投區裕民一路18號",            openTime: "11:30", closeTime: "23:00", closedDay: "無" },
  { id: 43, nightMarket: "麗山",          name: "麗山臨時攤販集中場",                  address: "臺北市內湖區內湖路一段737巷50弄6號",  openTime: "00:00", closeTime: "23:59", closedDay: "無" },
  { id: 44, nightMarket: "慈聖宮廣場",    name: "台北市大稻埕慈聖商圈協會",            address: "臺北市大同區保安街49巷32號後方",      openTime: "00:00", closeTime: "23:59", closedDay: "無" },
  { id: 45, nightMarket: "東三水街日市",  name: "新富町文化市場",                      address: "臺北市萬華區三水街70號",              openTime: "07:00", closeTime: "10:00", closedDay: "星期一" },
];

/**
 * Geocode a single address using Nominatim (OSM).
 * Returns { lat, lng } in WGS84 or null on failure.
 */
async function geocodeAddress(address) {
  // Clean up address for better geocoding
  const cleaned = address
    .replace(/\s+/g, " ")
    .replace(/臺北市/g, "台北市")
    .replace(/臺北/g, "台北")
    .replace(/之/g, "-")
    .replace(/號.*$/, "號")  // strip floor/unit info
    .trim();

  const query = encodeURIComponent(`${cleaned}, Taiwan`);
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=tw&accept-language=zh-TW`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "TaiwanMaps-FriendlyToilets/1.0 (geocoding script)",
        "Accept-Language": "zh-TW,zh;q=0.9",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const results = await res.json();
    if (results.length > 0) {
      return {
        lat: parseFloat(parseFloat(results[0].lat).toFixed(6)),
        lng: parseFloat(parseFloat(results[0].lon).toFixed(6)),
      };
    }
    return null;
  } catch (err) {
    console.error(`  Geocode error for "${address}": ${err.message}`);
    return null;
  }
}

/**
 * Sleep helper to respect Nominatim rate limit (1 req/sec).
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("🗺️  Starting geocoding for 45 friendly toilet entries...\n");

  // Load existing data as fallback
  const existingPath = join(__dirname, "../src/data/friendly_toilets.json");
  let existing = [];
  try {
    existing = JSON.parse(readFileSync(existingPath, "utf-8"));
  } catch {
    console.log("No existing file found, starting fresh.");
  }

  const existingMap = {};
  for (const e of existing) {
    existingMap[e.id] = { lat: e.lat, lng: e.lng };
  }

  const results = [];

  for (const entry of rawEntries) {
    process.stdout.write(`[${entry.id}/45] ${entry.name} — `);

    const coords = await geocodeAddress(entry.address);

    let lat, lng;
    if (coords) {
      lat = coords.lat;
      lng = coords.lng;
      console.log(`✅ ${lat}, ${lng}`);
    } else if (existingMap[entry.id]) {
      lat = existingMap[entry.id].lat;
      lng = existingMap[entry.id].lng;
      console.log(`⚠️  Using existing: ${lat}, ${lng}`);
    } else {
      // Fallback: Taipei city center
      lat = 25.0478;
      lng = 121.5170;
      console.log(`❌ FALLBACK to Taipei center`);
    }

    results.push({
      id: entry.id,
      nightMarket: entry.nightMarket,
      name: entry.name,
      address: entry.address,
      openTime: entry.openTime,
      closeTime: entry.closeTime,
      closedDay: entry.closedDay,
      lat,
      lng,
    });

    // Respect Nominatim rate limit: 1 request per second
    await sleep(1100);
  }

  writeFileSync(existingPath, JSON.stringify(results, null, 2), "utf-8");
  console.log(`\n✅ Done! Written to ${existingPath}`);
  console.log(`   Total entries: ${results.length}`);

  // Summary of any fallbacks
  const fallbacks = results.filter(r => r.lat === 25.0478 && r.lng === 121.5170);
  if (fallbacks.length > 0) {
    console.log(`\n⚠️  ${fallbacks.length} entries used fallback coordinates:`);
    fallbacks.forEach(f => console.log(`   - [${f.id}] ${f.name}`));
  }
}

main().catch(console.error);
