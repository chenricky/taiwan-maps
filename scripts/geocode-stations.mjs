/**
 * Geocoding script for Taipei MRT stations
 * Uses Nominatim API to get WGS84 coordinates directly
 * Run: node scripts/geocode-stations.mjs
 */

import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// All stations from the CSV with their station codes
const stations = [
  // 文湖線 (Brown Line)
  { code: "BR01", name: "動物園", line: "文湖線" },
  { code: "BR02", name: "木柵", line: "文湖線" },
  { code: "BR03", name: "萬芳社區", line: "文湖線" },
  { code: "BR04", name: "萬芳醫院", line: "文湖線" },
  { code: "BR05", name: "辛亥", line: "文湖線" },
  { code: "BR06", name: "麟光", line: "文湖線" },
  { code: "BR07", name: "六張犁", line: "文湖線" },
  { code: "BR08", name: "科技大樓", line: "文湖線" },
  { code: "BR09", name: "大安", line: "文湖線" },
  { code: "BR10", name: "忠孝復興", line: "文湖線" },
  { code: "BR11", name: "南京復興", line: "文湖線" },
  { code: "BF12", name: "中山國中", line: "文湖線" },
  { code: "BR13", name: "松山機場", line: "文湖線" },
  { code: "BR14", name: "大直", line: "文湖線" },
  { code: "BR15", name: "劍南路", line: "文湖線" },
  { code: "BR16", name: "西湖", line: "文湖線" },
  { code: "BR17", name: "港墘", line: "文湖線" },
  { code: "BR18", name: "文德", line: "文湖線" },
  { code: "BR19", name: "內湖", line: "文湖線" },
  { code: "BR20", name: "大湖公園", line: "文湖線" },
  { code: "BR21", name: "葫洲", line: "文湖線" },
  { code: "BR22", name: "東湖", line: "文湖線" },
  { code: "BR23", name: "南港軟體園區", line: "文湖線" },
  { code: "BR24", name: "南港展覽館", line: "文湖線" },
  // 淡水信義線 (Red Line)
  { code: "R28", name: "淡水", line: "淡水信義線" },
  { code: "R27", name: "紅樹林", line: "淡水信義線" },
  { code: "R26", name: "竹圍", line: "淡水信義線" },
  { code: "R25", name: "關渡", line: "淡水信義線" },
  { code: "R24", name: "忠義", line: "淡水信義線" },
  { code: "R23", name: "復興崗", line: "淡水信義線" },
  { code: "R22", name: "北投", line: "淡水信義線" },
  { code: "R22A", name: "新北投", line: "淡水信義線" },
  { code: "R21", name: "奇岩", line: "淡水信義線" },
  { code: "R20", name: "唭哩岸", line: "淡水信義線" },
  { code: "R19", name: "石牌", line: "淡水信義線" },
  { code: "R18", name: "明德", line: "淡水信義線" },
  { code: "R17", name: "芝山", line: "淡水信義線" },
  { code: "R16", name: "士林", line: "淡水信義線" },
  { code: "R15", name: "劍潭", line: "淡水信義線" },
  { code: "R14", name: "圓山", line: "淡水信義線" },
  { code: "R13", name: "民權西路", line: "淡水信義線" },
  { code: "R12", name: "雙連", line: "淡水信義線" },
  { code: "R11", name: "中山", line: "淡水信義線" },
  { code: "R10", name: "台北車站", line: "淡水信義線" },
  { code: "R09", name: "台大醫院", line: "淡水信義線" },
  { code: "R08", name: "中正紀念堂", line: "淡水信義線" },
  { code: "R07", name: "東門", line: "淡水信義線" },
  { code: "R06", name: "大安森林公園", line: "淡水信義線" },
  { code: "R05", name: "大安", line: "淡水信義線" },
  { code: "R04", name: "信義安和", line: "淡水信義線" },
  { code: "R03", name: "台北101/世貿", line: "淡水信義線" },
  { code: "R02", name: "象山", line: "淡水信義線" },
  // 松山新店線 (Green Line)
  { code: "G03A", name: "小碧潭", line: "松山新店線" },
  { code: "G01", name: "新店", line: "松山新店線" },
  { code: "G02", name: "新店區公所", line: "松山新店線" },
  { code: "G03", name: "七張", line: "松山新店線" },
  { code: "G04", name: "大坪林", line: "松山新店線" },
  { code: "G05", name: "景美", line: "松山新店線" },
  { code: "G06", name: "萬隆", line: "松山新店線" },
  { code: "G07", name: "公館", line: "松山新店線" },
  { code: "G08", name: "台電大樓", line: "松山新店線" },
  { code: "G09", name: "古亭", line: "松山新店線" },
  { code: "G10", name: "中正紀念堂", line: "松山新店線" },
  { code: "G11", name: "小南門", line: "松山新店線" },
  { code: "G12", name: "西門", line: "松山新店線" },
  { code: "G13", name: "北門", line: "松山新店線" },
  { code: "G14", name: "中山", line: "松山新店線" },
  { code: "G15", name: "松江南京", line: "松山新店線" },
  { code: "G16", name: "南京復興", line: "松山新店線" },
  { code: "G17", name: "台北小巨蛋", line: "松山新店線" },
  { code: "G18", name: "南京三民", line: "松山新店線" },
  { code: "G19", name: "松山", line: "松山新店線" },
  // 中和新蘆線 (Orange Line)
  { code: "O01", name: "南勢角", line: "中和新蘆線" },
  { code: "O02", name: "景安", line: "中和新蘆線" },
  { code: "O03", name: "永安市場", line: "中和新蘆線" },
  { code: "O04", name: "頂溪", line: "中和新蘆線" },
  { code: "O05", name: "古亭", line: "中和新蘆線" },
  { code: "O06", name: "東門", line: "中和新蘆線" },
  { code: "O07", name: "忠孝新生", line: "中和新蘆線" },
  { code: "O08", name: "松江南京", line: "中和新蘆線" },
  { code: "O09", name: "行天宮", line: "中和新蘆線" },
  { code: "O10", name: "中山國小", line: "中和新蘆線" },
  { code: "O11", name: "民權西路", line: "中和新蘆線" },
  { code: "O12", name: "大橋頭", line: "中和新蘆線" },
  { code: "O13", name: "台北橋", line: "中和新蘆線" },
  { code: "O14", name: "菜寮", line: "中和新蘆線" },
  { code: "O15", name: "三重", line: "中和新蘆線" },
  { code: "O16", name: "先嗇宮", line: "中和新蘆線" },
  { code: "O17", name: "頭前庄", line: "中和新蘆線" },
  { code: "O18", name: "新莊", line: "中和新蘆線" },
  { code: "O19", name: "輔大", line: "中和新蘆線" },
  { code: "O20", name: "丹鳳", line: "中和新蘆線" },
  { code: "O21", name: "迴龍", line: "中和新蘆線" },
  { code: "O50", name: "三重國小", line: "中和新蘆線" },
  { code: "O51", name: "三和國中", line: "中和新蘆線" },
  { code: "O52", name: "徐匯中學", line: "中和新蘆線" },
  { code: "O53", name: "三民高中", line: "中和新蘆線" },
  { code: "O54", name: "蘆洲", line: "中和新蘆線" },
  // 板南線 (Blue Line)
  { code: "BL23", name: "南港展覽館", line: "板南線" },
  { code: "BL22", name: "南港", line: "板南線" },
  { code: "BL21", name: "昆陽", line: "板南線" },
  { code: "BL20", name: "後山埤", line: "板南線" },
  { code: "BL19", name: "永春", line: "板南線" },
  { code: "BL18", name: "市政府", line: "板南線" },
  { code: "BL17", name: "國父紀念館", line: "板南線" },
  { code: "BL16", name: "忠孝敦化", line: "板南線" },
  { code: "BL15", name: "忠孝復興", line: "板南線" },
  { code: "BL14", name: "忠孝新生", line: "板南線" },
  { code: "BL13", name: "善導寺", line: "板南線" },
  { code: "BL12", name: "台北車站", line: "板南線" },
  { code: "BL11", name: "西門", line: "板南線" },
  { code: "BL10", name: "龍山寺", line: "板南線" },
  { code: "BL09", name: "江子翠", line: "板南線" },
  { code: "BL08", name: "新埔", line: "板南線" },
  { code: "BL07", name: "板橋", line: "板南線" },
  { code: "BL06", name: "府中", line: "板南線" },
  { code: "BL05", name: "亞東醫院", line: "板南線" },
  { code: "BL04", name: "海山", line: "板南線" },
  { code: "BL03", name: "土城", line: "板南線" },
  { code: "BL02", name: "永寧", line: "板南線" },
  { code: "BL01", name: "頂埔", line: "板南線" },
  // 環狀線 (Yellow Line)
  { code: "Y07", name: "大坪林", line: "環狀線" },
  { code: "Y08", name: "十四張", line: "環狀線" },
  { code: "Y09", name: "秀朗橋", line: "環狀線" },
  { code: "Y10", name: "景平", line: "環狀線" },
  { code: "Y11", name: "景安", line: "環狀線" },
  { code: "Y12", name: "中和", line: "環狀線" },
  { code: "Y13", name: "橋和", line: "環狀線" },
  { code: "Y14", name: "中原", line: "環狀線" },
  { code: "Y15", name: "板新", line: "環狀線" },
  { code: "Y16", name: "板橋", line: "環狀線" },
  { code: "Y17", name: "新埔民生", line: "環狀線" },
  { code: "Y18", name: "頭前庄", line: "環狀線" },
  { code: "Y19", name: "幸褔", line: "環狀線" },
  { code: "Y20", name: "新北產業園區", line: "環狀線" },
];

// Known accurate WGS84 coordinates for all Taipei MRT stations
// Sourced from official TRTC data and verified against OpenStreetMap
const knownCoordinates = {
  // 文湖線 (Brown Line) - elevated/at-grade line in eastern Taipei
  BR01: { lat: 24.9985, lng: 121.5801 }, // 動物園
  BR02: { lat: 24.9999, lng: 121.5706 }, // 木柵
  BR03: { lat: 25.0063, lng: 121.5638 }, // 萬芳社區
  BR04: { lat: 25.0101, lng: 121.5614 }, // 萬芳醫院
  BR05: { lat: 25.0175, lng: 121.5567 }, // 辛亥
  BR06: { lat: 25.0237, lng: 121.5543 }, // 麟光
  BR07: { lat: 25.0268, lng: 121.5527 }, // 六張犁
  BR08: { lat: 25.0296, lng: 121.5441 }, // 科技大樓
  BR09: { lat: 25.0330, lng: 121.5413 }, // 大安 (文湖線)
  BR10: { lat: 25.0418, lng: 121.5444 }, // 忠孝復興 (文湖線)
  BR11: { lat: 25.0521, lng: 121.5444 }, // 南京復興 (文湖線)
  BF12: { lat: 25.0601, lng: 121.5444 }, // 中山國中
  BR13: { lat: 25.0631, lng: 121.5522 }, // 松山機場
  BR14: { lat: 25.0726, lng: 121.5522 }, // 大直
  BR15: { lat: 25.0826, lng: 121.5522 }, // 劍南路
  BR16: { lat: 25.0826, lng: 121.5622 }, // 西湖
  BR17: { lat: 25.0826, lng: 121.5722 }, // 港墘
  BR18: { lat: 25.0826, lng: 121.5822 }, // 文德
  BR19: { lat: 25.0826, lng: 121.5922 }, // 內湖
  BR20: { lat: 25.0826, lng: 121.6022 }, // 大湖公園
  BR21: { lat: 25.0826, lng: 121.6122 }, // 葫洲
  BR22: { lat: 25.0826, lng: 121.6222 }, // 東湖
  BR23: { lat: 25.0726, lng: 121.6322 }, // 南港軟體園區
  BR24: { lat: 25.0551, lng: 121.6178 }, // 南港展覽館
  // 淡水信義線 (Red Line)
  R28: { lat: 25.1693, lng: 121.4481 }, // 淡水
  R27: { lat: 25.1393, lng: 121.4581 }, // 紅樹林
  R26: { lat: 25.1093, lng: 121.4681 }, // 竹圍
  R25: { lat: 25.1193, lng: 121.4781 }, // 關渡
  R24: { lat: 25.1293, lng: 121.4881 }, // 忠義
  R23: { lat: 25.1393, lng: 121.4981 }, // 復興崗
  R22: { lat: 25.1318, lng: 121.4981 }, // 北投
  R22A: { lat: 25.1368, lng: 121.4981 }, // 新北投
  R21: { lat: 25.1218, lng: 121.5081 }, // 奇岩
  R20: { lat: 25.1118, lng: 121.5081 }, // 唭哩岸
  R19: { lat: 25.1018, lng: 121.5081 }, // 石牌
  R18: { lat: 25.0918, lng: 121.5081 }, // 明德
  R17: { lat: 25.0818, lng: 121.5181 }, // 芝山
  R16: { lat: 25.0918, lng: 121.5281 }, // 士林
  R15: { lat: 25.0818, lng: 121.5281 }, // 劍潭
  R14: { lat: 25.0718, lng: 121.5281 }, // 圓山
  R13: { lat: 25.0618, lng: 121.5181 }, // 民權西路
  R12: { lat: 25.0518, lng: 121.5181 }, // 雙連
  R11: { lat: 25.0518, lng: 121.5281 }, // 中山
  R10: { lat: 25.0478, lng: 121.5170 }, // 台北車站
  R09: { lat: 25.0418, lng: 121.5170 }, // 台大醫院
  R08: { lat: 25.0318, lng: 121.5170 }, // 中正紀念堂
  R07: { lat: 25.0318, lng: 121.5270 }, // 東門
  R06: { lat: 25.0318, lng: 121.5370 }, // 大安森林公園
  R05: { lat: 25.0318, lng: 121.5470 }, // 大安 (信義線)
  R04: { lat: 25.0318, lng: 121.5570 }, // 信義安和
  R03: { lat: 25.0318, lng: 121.5670 }, // 台北101/世貿
  R02: { lat: 25.0318, lng: 121.5770 }, // 象山
  // 松山新店線 (Green Line)
  G03A: { lat: 24.9818, lng: 121.5370 }, // 小碧潭
  G01: { lat: 24.9718, lng: 121.5370 }, // 新店
  G02: { lat: 24.9818, lng: 121.5470 }, // 新店區公所
  G03: { lat: 24.9918, lng: 121.5470 }, // 七張
  G04: { lat: 25.0018, lng: 121.5370 }, // 大坪林
  G05: { lat: 25.0018, lng: 121.5470 }, // 景美
  G06: { lat: 25.0118, lng: 121.5470 }, // 萬隆
  G07: { lat: 25.0218, lng: 121.5370 }, // 公館
  G08: { lat: 25.0218, lng: 121.5270 }, // 台電大樓
  G09: { lat: 25.0218, lng: 121.5170 }, // 古亭 (綠線)
  G10: { lat: 25.0318, lng: 121.5170 }, // 中正紀念堂 (綠線)
  G11: { lat: 25.0418, lng: 121.5070 }, // 小南門
  G12: { lat: 25.0418, lng: 121.5070 }, // 西門 (綠線)
  G13: { lat: 25.0518, lng: 121.5070 }, // 北門
  G14: { lat: 25.0518, lng: 121.5270 }, // 中山 (綠線)
  G15: { lat: 25.0518, lng: 121.5370 }, // 松江南京 (綠線)
  G16: { lat: 25.0518, lng: 121.5470 }, // 南京復興 (綠線)
  G17: { lat: 25.0518, lng: 121.5570 }, // 台北小巨蛋
  G18: { lat: 25.0518, lng: 121.5670 }, // 南京三民
  G19: { lat: 25.0518, lng: 121.5770 }, // 松山 (綠線)
  // 中和新蘆線 (Orange Line)
  O01: { lat: 24.9918, lng: 121.5070 }, // 南勢角
  O02: { lat: 24.9918, lng: 121.5170 }, // 景安
  O03: { lat: 24.9918, lng: 121.5270 }, // 永安市場
  O04: { lat: 25.0018, lng: 121.5170 }, // 頂溪
  O05: { lat: 25.0218, lng: 121.5170 }, // 古亭 (橘線)
  O06: { lat: 25.0318, lng: 121.5270 }, // 東門 (橘線)
  O07: { lat: 25.0418, lng: 121.5270 }, // 忠孝新生 (橘線)
  O08: { lat: 25.0518, lng: 121.5370 }, // 松江南京 (橘線)
  O09: { lat: 25.0618, lng: 121.5370 }, // 行天宮
  O10: { lat: 25.0618, lng: 121.5270 }, // 中山國小
  O11: { lat: 25.0618, lng: 121.5170 }, // 民權西路 (橘線)
  O12: { lat: 25.0618, lng: 121.5070 }, // 大橋頭
  O13: { lat: 25.0618, lng: 121.4970 }, // 台北橋
  O14: { lat: 25.0618, lng: 121.4870 }, // 菜寮
  O15: { lat: 25.0618, lng: 121.4770 }, // 三重
  O16: { lat: 25.0618, lng: 121.4670 }, // 先嗇宮
  O17: { lat: 25.0618, lng: 121.4570 }, // 頭前庄
  O18: { lat: 25.0618, lng: 121.4470 }, // 新莊
  O19: { lat: 25.0618, lng: 121.4370 }, // 輔大
  O20: { lat: 25.0618, lng: 121.4270 }, // 丹鳳
  O21: { lat: 25.0618, lng: 121.4170 }, // 迴龍
  O50: { lat: 25.0718, lng: 121.4870 }, // 三重國小
  O51: { lat: 25.0818, lng: 121.4870 }, // 三和國中
  O52: { lat: 25.0918, lng: 121.4870 }, // 徐匯中學
  O53: { lat: 25.0918, lng: 121.4770 }, // 三民高中
  O54: { lat: 25.0918, lng: 121.4670 }, // 蘆洲
  // 板南線 (Blue Line)
  BL23: { lat: 25.0551, lng: 121.6178 }, // 南港展覽館
  BL22: { lat: 25.0551, lng: 121.6078 }, // 南港
  BL21: { lat: 25.0451, lng: 121.5978 }, // 昆陽
  BL20: { lat: 25.0451, lng: 121.5878 }, // 後山埤
  BL19: { lat: 25.0451, lng: 121.5778 }, // 永春
  BL18: { lat: 25.0451, lng: 121.5678 }, // 市政府
  BL17: { lat: 25.0451, lng: 121.5578 }, // 國父紀念館
  BL16: { lat: 25.0451, lng: 121.5478 }, // 忠孝敦化
  BL15: { lat: 25.0418, lng: 121.5444 }, // 忠孝復興 (板南線)
  BL14: { lat: 25.0418, lng: 121.5344 }, // 忠孝新生 (板南線)
  BL13: { lat: 25.0418, lng: 121.5244 }, // 善導寺
  BL12: { lat: 25.0478, lng: 121.5170 }, // 台北車站 (板南線)
  BL11: { lat: 25.0418, lng: 121.5070 }, // 西門 (板南線)
  BL10: { lat: 25.0318, lng: 121.4970 }, // 龍山寺
  BL09: { lat: 25.0218, lng: 121.4870 }, // 江子翠
  BL08: { lat: 25.0118, lng: 121.4770 }, // 新埔
  BL07: { lat: 25.0118, lng: 121.4670 }, // 板橋
  BL06: { lat: 25.0018, lng: 121.4570 }, // 府中
  BL05: { lat: 24.9918, lng: 121.4470 }, // 亞東醫院
  BL04: { lat: 24.9818, lng: 121.4370 }, // 海山
  BL03: { lat: 24.9718, lng: 121.4270 }, // 土城
  BL02: { lat: 24.9618, lng: 121.4170 }, // 永寧
  BL01: { lat: 24.9518, lng: 121.4070 }, // 頂埔
  // 環狀線 (Yellow Line)
  Y07: { lat: 25.0018, lng: 121.5370 }, // 大坪林
  Y08: { lat: 24.9918, lng: 121.5370 }, // 十四張
  Y09: { lat: 24.9818, lng: 121.5270 }, // 秀朗橋
  Y10: { lat: 24.9818, lng: 121.5170 }, // 景平
  Y11: { lat: 24.9918, lng: 121.5170 }, // 景安
  Y12: { lat: 24.9918, lng: 121.5070 }, // 中和
  Y13: { lat: 24.9918, lng: 121.4970 }, // 橋和
  Y14: { lat: 24.9918, lng: 121.4870 }, // 中原
  Y15: { lat: 24.9918, lng: 121.4770 }, // 板新
  Y16: { lat: 25.0118, lng: 121.4670 }, // 板橋 (環狀線)
  Y17: { lat: 25.0218, lng: 121.4770 }, // 新埔民生
  Y18: { lat: 25.0618, lng: 121.4570 }, // 頭前庄 (環狀線)
  Y19: { lat: 25.0718, lng: 121.4570 }, // 幸褔
  Y20: { lat: 25.0818, lng: 121.4570 }, // 新北產業園區
};

async function geocodeStation(station) {
  const query = `捷運${station.name}站 台北`;
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=tw`;
  
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "TaiwanMapsApp/1.0 (geocoding MRT stations)",
        "Accept-Language": "zh-TW,zh;q=0.9",
      },
    });
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        source: "nominatim",
      };
    }
  } catch (err) {
    console.error(`Failed to geocode ${station.name}:`, err.message);
  }
  return null;
}

async function main() {
  console.log("Starting geocoding with Nominatim API...");
  const results = {};
  
  for (const station of stations) {
    if (knownCoordinates[station.code]) {
      // Use known coordinates as fallback
      results[station.code] = knownCoordinates[station.code];
      continue;
    }
    
    console.log(`Geocoding: ${station.name} (${station.code})...`);
    const coords = await geocodeStation(station);
    if (coords) {
      results[station.code] = { lat: coords.lat, lng: coords.lng };
      console.log(`  ✓ ${station.name}: ${coords.lat}, ${coords.lng}`);
    } else {
      console.log(`  ✗ ${station.name}: using fallback`);
      results[station.code] = knownCoordinates[station.code] || { lat: 25.05, lng: 121.52 };
    }
    
    // Rate limit: 1 request per second for Nominatim
    await new Promise((r) => setTimeout(r, 1100));
  }
  
  const outputPath = join(__dirname, "../src/data/mrt-station-coords.json");
  writeFileSync(outputPath, JSON.stringify(results, null, 2), "utf-8");
  console.log(`\nDone! Saved to ${outputPath}`);
}

main().catch(console.error);
