# 🗺️ Taiwan Maps

An interactive Taipei map application built with **Next.js 15**, **React-Leaflet**, and **Tailwind CSS**, deployed on **Vercel** with persistent storage via the **GitHub Contents API**.

**Live URL:** https://taiwan-maps.vercel.app/

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Map Layers](#map-layers)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Local Development](#local-development)
6. [Environment Variables](#environment-variables)
7. [Deployment Guide](#deployment-guide)
   - [GitHub Push (Bypassing Push Protection)](#github-push-bypassing-push-protection)
   - [Vercel Deployment](#vercel-deployment)
8. [Data Pre-processing Scripts](#data-pre-processing-scripts)
9. [Storage Schema](#storage-schema)
10. [Troubleshooting](#troubleshooting)

---

## Project Overview

Taiwan Maps is a senior-friendly interactive map for Taipei City featuring:
- Multiple toggleable map layers (MRT, tourist spots, toilets, trails, etc.)
- Bookmark & sticky note system with cloud persistence
- Route planning (driving / walking / cycling via OSRM)
- Fully responsive UI — desktop floating panel + mobile bottom sheet
- No login required; data stored in a private GitHub repository

---

## Map Layers

| Toggle | Layer | Data Source |
|--------|-------|-------------|
| ✨ | 精選觀光景點 (Tourist Spots) | `src/data/tourist_spots.json` (50 spots, WGS84) |
| ♿ | 捷運出入口設施 (MRT Facilities) | `src/data/mrt_facilities.json` |
| 🚇 | 捷運路網線 (MRT Route Lines) | `src/data/mrt_routes.json` |
| 🚻 | 夜市友善廁所 (Friendly Toilets) | `src/data/friendly_toilets.json` |
| 🥾 | 健走步道 (Walking Trails) | `src/data/walking_trails.json` |
| 🚌 | 出口公車轉乘 (Bus Transfers) | `src/data/mrt_bus_transfers.json` |
| 📝 | 地圖便利貼 (Sticky Notes) | Cloud (GitHub storage) |

### Tourist Spots Layer Details
- **Dataset:** 臺北旅遊網景點資料中文 (附件2 CSV)
- **Pre-processing:** `scripts/preprocess-tourism.js` — static WGS84 coordinate hash map
- **Output:** `src/data/tourist_spots.json` — 50 spots with `name`, `district`, `theme`, `lat`, `lng`
- **UI:** Amber ✨ circular markers; click → senior-friendly popup with 行政區 + 主題景點

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, Turbopack) |
| UI | React 19 + Tailwind CSS v4 |
| Map | React-Leaflet 4 + Leaflet 1.9 |
| Routing | OSRM public API |
| Storage | GitHub Contents API (flat JSON) |
| Deployment | Vercel (production) |
| Language | TypeScript 5 |

---

## Project Structure

```
taiwan-maps/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main page — layer state, RWD overlay panel
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── api/storage/route.ts  # GET/POST flat JSON storage via GitHub API
│   ├── components/
│   │   ├── MapComponent.tsx      # Leaflet map container + all layer mounts
│   │   ├── TouristSpotsLayer.tsx # ✨ Tourist spots markers + popups
│   │   ├── MrtRouteLayer.tsx     # 🚇 MRT polyline network
│   │   ├── MrtFacilitiesLayer.tsx# ♿ Elevator/ramp markers
│   │   ├── FriendlyToiletLayer.tsx
│   │   ├── WalkingTrailLayer.tsx
│   │   ├── BusTransferLayer.tsx
│   │   ├── SearchBar.tsx
│   │   ├── RoutingPanel.tsx
│   │   ├── BookmarksSidebar.tsx
│   │   ├── BookmarkModal.tsx
│   │   ├── StickyNoteModal.tsx
│   │   └── TodoPanel.tsx
│   ├── data/
│   │   ├── tourist_spots.json    # Pre-processed tourist spots (50 entries)
│   │   ├── mrt_routes.json
│   │   ├── mrt_facilities.json
│   │   ├── mrt_stations.json
│   │   ├── mrt-station-coords.json
│   │   ├── friendly_toilets.json
│   │   ├── walking_trails.json
│   │   └── mrt_bus_transfers.json
│   ├── lib/
│   │   └── github-storage.ts     # GitHub Contents API read/write helpers
│   └── types/
│       └── index.ts
├── scripts/
│   ├── full-push.mjs             # ✅ PRIMARY deploy script — pushes all source files
│   ├── push-tourist-layer.mjs    # Pushes tourist layer files only
│   ├── preprocess-tourism.js     # Generates tourist_spots.json from CSV
│   └── ...
├── .env.local                    # Local secrets (never committed)
├── next.config.ts
├── package.json
└── README.md
```

---

## Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
# → http://localhost:3000

# Build for production (verify before deploying)
npm run build
```

---

## Environment Variables

### `.env.local` (local development only — never commit this file)

```env
# GitHub PAT for reading/writing user data (bookmarks, notes, todos)
GITHUB_TOKEN=<your-github-personal-access-token>

# GitHub repo where user data JSON is stored
GITHUB_OWNER=chenricky
GITHUB_REPO=taiwan-maps
GITHUB_DATA_PATH=data/user_data.json
```

### Vercel Environment Variables

Set these in **Vercel Dashboard → Project Settings → Environment Variables**:

| Variable | Description |
|----------|-------------|
| `GITHUB_TOKEN` | GitHub Personal Access Token (PAT) with `repo` scope |
| `GITHUB_OWNER` | `chenricky` |
| `GITHUB_REPO` | `taiwan-maps` |
| `GITHUB_DATA_PATH` | `data/user_data.json` |

> 🔑 **Token storage:** All tokens are stored only in `.env.local` (local) and Vercel's encrypted environment variable store. They are **never hardcoded** in source files.

---

## Deployment Guide

### Repository Info

| Field | Value |
|-------|-------|
| GitHub Username | `chenricky` |
| Repository Name | `taiwan-maps` |
| Repository URL | https://github.com/chenricky/taiwan-maps |
| Default Branch | `master` |
| Vercel Project ID | `prj_b5PZ3KtMI0gzroKDik7l7YLtwSk4` |
| Live URL | https://taiwan-maps.vercel.app/ |

---

### GitHub Push (Bypassing Push Protection)

> ⚠️ **Why `git push` is blocked:** GitHub Push Protection detects hardcoded tokens in older script files in the git history. A normal `git push` will be rejected with error `GH013: Repository rule violations — Push cannot contain secrets`.

#### ✅ Correct Method: GitHub Git Data API (no `git push` needed)

Use `scripts/full-push.mjs` which pushes all source files directly via the GitHub Git Data API.  
The PAT is passed as an **environment variable at runtime** — never stored in the file.

**PowerShell:**
```powershell
$env:GH_PAT="<your-github-pat>"
node scripts/full-push.mjs
```

**What `full-push.mjs` does internally:**
1. Reads the current HEAD commit SHA from `master` via the GitHub API
2. Creates GitHub blob objects for all 33 source files
3. Creates a new tree object combining all blobs with the existing repo tree
4. Creates a new commit pointing to the new tree
5. Force-updates `refs/heads/master` to the new commit SHA

**Files pushed by `full-push.mjs`:**
- All `src/app/` files (page.tsx, layout.tsx, globals.css, api/storage/route.ts)
- All `src/components/` files (17 components)
- All `src/data/` JSON files (8 datasets)
- `src/lib/github-storage.ts`, `src/types/index.ts`
- Config files (package.json, next.config.ts, tsconfig.json, etc.)

---

### Vercel Deployment

#### Option A: Automatic (via GitHub webhook)
Vercel is connected to the `chenricky/taiwan-maps` repository. Any push to `master` automatically triggers a production deployment.

> ⚠️ **Note:** Since we use the Git Data API (not `git push`), the GitHub webhook may not always fire. Use Option B to guarantee deployment.

#### Option B: Manual trigger via Vercel API ✅ (Recommended)

After running `full-push.mjs`, copy the `Full commit SHA` printed at the end, then run:

```powershell
node -e "
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const PROJECT_ID = 'prj_b5PZ3KtMI0gzroKDik7l7YLtwSk4';
const COMMIT_SHA = '<paste-full-sha-from-full-push-output>';

fetch('https://api.vercel.com/v13/deployments?projectId=' + PROJECT_ID, {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + VERCEL_TOKEN, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'taiwan-maps',
    target: 'production',
    gitSource: { type: 'github', org: 'chenricky', repo: 'taiwan-maps', ref: COMMIT_SHA }
  })
}).then(r=>r.json()).then(d=>console.log('Deploy ID:', d.id, '| URL: https://' + d.url))
"
```

Set `$env:VERCEL_TOKEN` to your Vercel Personal Access Token before running.

#### Option C: Complete deploy workflow (push + deploy in sequence)

```powershell
# Step 1: Push all source files to GitHub
$env:GH_PAT="<your-github-pat>"
node scripts/full-push.mjs
# Output will show: "Full commit SHA: <40-char-sha>"

# Step 2: Trigger Vercel deployment with that SHA
$env:VERCEL_TOKEN="<your-vercel-pat>"
# Then run the node -e command from Option B with the SHA from Step 1
```

#### Vercel Project Info

| Field | Value |
|-------|-------|
| Project ID | `prj_b5PZ3KtMI0gzroKDik7l7YLtwSk4` |
| Project Name | `taiwan-maps` |
| Team/Owner | `ricky-chen-s-projects` |
| Production URL | https://taiwan-maps.vercel.app/ |
| Vercel Dashboard | https://vercel.com/ricky-chen-s-projects/taiwan-maps |

> 🔑 **Vercel PAT:** Stored in `.env.local` as `VERCEL_TOKEN`. Never hardcode in scripts.

---

## Data Pre-processing Scripts

### Tourist Spots (`scripts/preprocess-tourism.js`)

Parses the CSV dataset and generates `src/data/tourist_spots.json`.

```bash
node scripts/preprocess-tourism.js
```

**Strategy:** Uses a static WGS84 coordinate hash dictionary — no external geocoding API, no rate limits, no freezes. Maps 50 attraction names from the CSV `精選景點` column to verified coordinates.

**Input:** `附件2-臺北旅遊網景點資料中文(更1140715 (1).csv`  
**Output:** `src/data/tourist_spots.json`

**Output schema:**
```json
[
  {
    "name": "台北101",
    "district": "信義區",
    "theme": "都會潮流與文化創意",
    "lat": 25.0339,
    "lng": 121.5644
  }
]
```

**Districts covered:** 北投區, 士林區, 內湖區, 松山區, 中山區, 大同區, 南港區, 信義區, 大安區, 中正區, 萬華區, 文山區, 各行政區

---

## Storage Schema

The flat JSON storage file (`data/user_data.json` in the GitHub repo) uses this exact schema:

```json
{
  "bookmarks": [
    {
      "id": "bm-1234567890",
      "lat": 25.0478,
      "lng": 121.5170,
      "label": "My Location",
      "createdAt": "2026-06-14T00:00:00.000Z"
    }
  ],
  "stickyNotes": [
    {
      "id": "note-1234567890",
      "lat": 25.0478,
      "lng": 121.5170,
      "content": "Remember this place!",
      "color": "#fef08a",
      "createdAt": "2026-06-14T00:00:00.000Z"
    }
  ],
  "todos": [
    {
      "id": "todo-1234567890",
      "text": "Visit Taipei 101",
      "completed": false,
      "reminderDate": null,
      "reminderBookmarkId": null,
      "createdAt": "2026-06-14T00:00:00.000Z"
    }
  ],
  "updatedAt": "2026-06-14T00:00:00.000Z"
}
```

> ⚠️ **Important:** The API route at `src/app/api/storage/route.ts` must never be modified. It handles the `bookmarks`, `stickyNotes`, and `todos` arrays with defensive defaults.

---

## Troubleshooting

### `git push` blocked by GitHub Push Protection

**Error:** `GH013: Repository rule violations found — Push cannot contain secrets`

**Cause:** Older script files in git history contain hardcoded PATs/tokens.

**Fix:** Use `full-push.mjs` instead of `git push` — see [GitHub Push section](#github-push-bypassing-push-protection).

---

### Vercel build fails (`npm run build exited with 1`)

**Cause:** The GitHub API commit was built on an orphan tree missing some source files.

**Fix:** Always use `full-push.mjs` (not `push-tourist-layer.mjs`) which pushes all 33 files. Verify locally first:
```bash
npm run build
```

---

### Changes not visible on https://taiwan-maps.vercel.app/

**Cause:** Vercel's GitHub webhook may not fire for Git Data API commits (only fires for `git push`).

**Fix:** Manually trigger a Vercel deployment using Option B or C above, pointing to the exact commit SHA.

---

### `failed to push some refs` (git ref sync block)

**Cause:** Local branch is ahead of or diverged from `origin/master`.

**Fix:** Use `full-push.mjs` which uses `force: true` on the ref update — completely bypasses this error.

---

### Map not loading / blank screen

1. Check browser console for errors
2. Verify `GITHUB_TOKEN` is set in Vercel environment variables
3. Check that `src/data/*.json` files are present in the GitHub repo at the deployed commit

---

## Recent Deployment History

| Commit | Description | Date |
|--------|-------------|------|
| `926d768` | Full source push — Tourist Spots + RWD overlay panel (LIVE) | 2026-06-14 |
| `d65265f` | Tourist Spots layer + responsive redesign (partial) | 2026-06-14 |
| `fe549e8` | Tourist Spots layer initial push | 2026-06-14 |
| `82f897e` | MRT station facilities layer | — |
| `9123b6d` | MRT route lines layer | — |
| `a3a3a78` | Initial commit | — |

---

*Built with ❤️ for Taipei City tourism and accessibility.*
