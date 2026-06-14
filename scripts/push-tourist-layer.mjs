/**
 * push-tourist-layer.mjs
 * Pushes the Tourist Spots layer files to GitHub via the Git Data API.
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const TOKEN  = "REDACTED_GITHUB_TOKEN";
const OWNER  = "chenricky";
const REPO   = "taiwan-maps";
const BRANCH = "master";
const BASE   = `https://api.github.com/repos/${OWNER}/${REPO}`;

const HEADERS = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: "application/vnd.github.v3+json",
  "Content-Type": "application/json",
  "User-Agent": "taiwan-maps-deploy-script",
};

const FILES_TO_PUSH = [
  "src/data/tourist_spots.json",
  "src/components/TouristSpotsLayer.tsx",
  "src/components/MapComponent.tsx",
  "src/app/page.tsx",
  "scripts/preprocess-tourism.js",
];

async function api(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { ...HEADERS, ...(opts.headers || {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${opts.method || "GET"} ${path} → ${res.status}: ${text.slice(0, 400)}`);
  return JSON.parse(text);
}

async function getHeadSha() {
  const data = await api(`/git/ref/heads/${BRANCH}`);
  return data.object.sha;
}

async function getTreeSha(commitSha) {
  const data = await api(`/git/commits/${commitSha}`);
  return data.tree.sha;
}

async function createBlob(content) {
  const data = await api("/git/blobs", {
    method: "POST",
    body: JSON.stringify({
      content: content.toString("base64"),
      encoding: "base64",
    }),
  });
  return data.sha;
}

async function createTree(baseTreeSha, fileBlobs) {
  const tree = fileBlobs.map(({ path, blobSha }) => ({
    path,
    mode: "100644",
    type: "blob",
    sha: blobSha,
  }));
  const data = await api("/git/trees", {
    method: "POST",
    body: JSON.stringify({ base_tree: baseTreeSha, tree }),
  });
  return data.sha;
}

async function createCommit(message, treeSha, parentSha) {
  const data = await api("/git/commits", {
    method: "POST",
    body: JSON.stringify({ message, tree: treeSha, parents: [parentSha] }),
  });
  return data.sha;
}

async function updateRef(commitSha) {
  await api(`/git/refs/heads/${BRANCH}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commitSha, force: false }),
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log(`\n🚀 Pushing Tourist Spots layer to ${OWNER}/${REPO} (${BRANCH})...\n`);

process.stdout.write("  Getting HEAD commit... ");
const headSha = await getHeadSha();
console.log(headSha.slice(0, 7));

process.stdout.write("  Getting base tree... ");
const baseTreeSha = await getTreeSha(headSha);
console.log(baseTreeSha.slice(0, 7));

const fileBlobs = [];
for (const filePath of FILES_TO_PUSH) {
  const localPath = resolve(ROOT, filePath);
  if (!existsSync(localPath)) {
    console.log(`  SKIP (not found): ${filePath}`);
    continue;
  }
  process.stdout.write(`  Creating blob: ${filePath} ... `);
  const content = readFileSync(localPath);
  const blobSha = await createBlob(content);
  fileBlobs.push({ path: filePath, blobSha });
  console.log(blobSha.slice(0, 7));
}

process.stdout.write(`\n  Creating tree with ${fileBlobs.length} files... `);
const newTreeSha = await createTree(baseTreeSha, fileBlobs);
console.log(newTreeSha.slice(0, 7));

process.stdout.write("  Creating commit... ");
const newCommitSha = await createCommit(
  "feat: add Taipei Featured Tourist Spots layer (6th map layer)\n\n- preprocess-tourism.js: static WGS84 coordinate dictionary for all 51 spots\n- tourist_spots.json: pre-processed flat JSON cache (name, district, theme, lat, lng)\n- TouristSpotsLayer.tsx: amber ✨ markers with senior-friendly popup cards\n- MapComponent.tsx: showTouristLayer prop + layer mount/unmount\n- page.tsx: showTouristLayer state + '✨ 顯示精選觀光景點' toggle button\n- storage/route.ts untouched; schema {bookmarks, notes, todos} preserved",
  newTreeSha,
  headSha
);
console.log(newCommitSha.slice(0, 7));

process.stdout.write(`  Updating refs/heads/${BRANCH}... `);
await updateRef(newCommitSha);
console.log("done");

console.log(`\n✅ Successfully pushed commit ${newCommitSha.slice(0, 7)} to ${OWNER}/${REPO}/${BRANCH}`);
console.log(`   Vercel will auto-deploy from the new commit.\n`);
