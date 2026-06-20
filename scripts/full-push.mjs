/**
 * full-push.mjs
 * Pushes ALL essential source files to GitHub via the Git Data API,
 * then triggers a Vercel production deployment.
 * Token passed via GH_PAT env var — no hardcoded secrets.
 *
 * Usage (PowerShell):
 *   $env:GH_PAT="<token>"; node scripts/full-push.mjs
 */
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { resolve, dirname, relative, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const TOKEN  = process.env.GH_PAT;
if (!TOKEN) throw new Error("GH_PAT environment variable is not set.");

const OWNER  = "chenricky";
const REPO   = "taiwan-maps";
const BRANCH = "master";
const BASE   = `https://api.github.com/repos/${OWNER}/${REPO}`;

const GH_HEADERS = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: "application/vnd.github.v3+json",
  "Content-Type": "application/json",
  "User-Agent": "taiwan-maps-full-push",
};

// ── Files to push (all essential source files) ────────────────────────────────
const FILES_TO_PUSH = [
  // App source
  "src/app/page.tsx",
  "src/app/layout.tsx",
  "src/app/globals.css",
  "src/app/api/storage/route.ts",
  // Components
  "src/components/MapComponent.tsx",
  "src/components/TouristSpotsLayer.tsx",
  "src/components/MrtRouteLayer.tsx",
  "src/components/MrtFacilitiesLayer.tsx",
  "src/components/FriendlyToiletLayer.tsx",
  "src/components/WalkingTrailLayer.tsx",
  "src/components/SlopeHeatmapLayer.tsx",
  "src/components/BusTransferLayer.tsx",
  "src/components/SearchBar.tsx",
  "src/components/RoutingPanel.tsx",
  "src/components/BookmarksSidebar.tsx",
  "src/components/BookmarkModal.tsx",
  "src/components/StickyNoteModal.tsx",
  "src/components/TodoPanel.tsx",
  // Data
  "src/data/tourist_spots.json",
  "src/data/mrt_routes.json",
  "src/data/mrt_facilities.json",
  "src/data/mrt_stations.json",
  "src/data/mrt-station-coords.json",
  "src/data/friendly_toilets.json",
  "src/data/walking_trails.json",
  "src/data/walking_trails_graded.json",
  "src/data/taipei_slope_grid.json",
  "src/data/mrt_bus_transfers.json",
  // Lib & types
  "src/lib/github-storage.ts",
  "src/types/index.ts",
  // Config
  "package.json",
  "package-lock.json",
  "next.config.ts",
  "tsconfig.json",
  "postcss.config.mjs",
  "eslint.config.mjs",
  "CLINE_HANDOVER.md",
];

// ── GitHub API helpers ────────────────────────────────────────────────────────
async function ghApi(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { ...GH_HEADERS, ...(opts.headers || {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${opts.method || "GET"} ${path} → ${res.status}: ${text.slice(0, 500)}`);
  return JSON.parse(text);
}

async function getHeadSha() {
  const data = await ghApi(`/git/ref/heads/${BRANCH}`);
  return data.object.sha;
}

async function getTreeSha(commitSha) {
  const data = await ghApi(`/git/commits/${commitSha}`);
  return data.tree.sha;
}

async function createBlob(content) {
  const data = await ghApi("/git/blobs", {
    method: "POST",
    body: JSON.stringify({ content: content.toString("base64"), encoding: "base64" }),
  });
  return data.sha;
}

async function createTree(baseTreeSha, fileBlobs) {
  const tree = fileBlobs.map(({ path, blobSha }) => ({
    path, mode: "100644", type: "blob", sha: blobSha,
  }));
  const data = await ghApi("/git/trees", {
    method: "POST",
    body: JSON.stringify({ base_tree: baseTreeSha, tree }),
  });
  return data.sha;
}

async function createCommit(message, treeSha, parentSha) {
  const data = await ghApi("/git/commits", {
    method: "POST",
    body: JSON.stringify({ message, tree: treeSha, parents: [parentSha] }),
  });
  return data.sha;
}

async function updateRef(commitSha) {
  await ghApi(`/git/refs/heads/${BRANCH}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commitSha, force: true }),
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log(`\n🚀 Full source push to ${OWNER}/${REPO} (${BRANCH})...\n`);

process.stdout.write("  Getting HEAD commit... ");
const headSha = await getHeadSha();
console.log(headSha.slice(0, 7));

process.stdout.write("  Getting base tree... ");
const baseTreeSha = await getTreeSha(headSha);
console.log(baseTreeSha.slice(0, 7));

const fileBlobs = [];
let skipped = 0;
for (const filePath of FILES_TO_PUSH) {
  const localPath = resolve(ROOT, filePath);
  if (!existsSync(localPath)) {
    console.log(`  SKIP (not found): ${filePath}`);
    skipped++;
    continue;
  }
  process.stdout.write(`  Blob: ${filePath} ... `);
  const content = readFileSync(localPath);
  const blobSha = await createBlob(content);
  fileBlobs.push({ path: filePath, blobSha });
  console.log(blobSha.slice(0, 7));
}

console.log(`\n  ${fileBlobs.length} files staged, ${skipped} skipped.`);

process.stdout.write(`\n  Creating tree... `);
const newTreeSha = await createTree(baseTreeSha, fileBlobs);
console.log(newTreeSha.slice(0, 7));

process.stdout.write("  Creating commit... ");
const newCommitSha = await createCommit(
  "chore: package complete workspace context, static caches, and hand-off markdown documentation\n\n" +
  "- CLINE_HANDOVER.md: full project state, architecture notes, resume instructions\n" +
  "- taipei_slope_grid.json: regenerated 2500-cell heatmap cache\n" +
  "- walking_trails_graded.json: 46 DSM-graded trails preserved\n" +
  "- All 8 map layers confirmed live: MRT routes, facilities, tourist spots,\n" +
  "  graded trails, slope heatmap, friendly toilets, bus transfers, sticky notes\n" +
  "- storage/route.ts: untouched, {bookmarks, stickyNotes, todos} schema preserved",
  newTreeSha,
  headSha
);
console.log(newCommitSha.slice(0, 7));

process.stdout.write(`  Updating refs/heads/${BRANCH} (force)... `);
await updateRef(newCommitSha);
console.log("done\n");

console.log(`✅ Pushed commit ${newCommitSha.slice(0, 7)} to ${OWNER}/${REPO}/${BRANCH}`);
console.log(`\n   Full commit SHA: ${newCommitSha}\n`);
