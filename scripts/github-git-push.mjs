/**
 * Pushes files to GitHub using the low-level Git Data API (trees + commits).
 * This uses a different API surface than the Contents API and works with
 * fine-grained PATs that have push permission.
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const TOKEN  = "REDACTED_GITHUB_PAT";
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
  "src/app/api/storage/route.ts",
  "src/lib/github-storage.ts",
  "src/data/friendly_toilets.json",
  "src/components/FriendlyToiletLayer.tsx",
  "src/components/MapComponent.tsx",
  "src/app/page.tsx",
  "scripts/geocode-stations.mjs",
  "scripts/verify-toilet-coords.mjs",
  "src/data/mrt-station-coords.json",
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

// Step 1: Get the current HEAD commit SHA for the branch
async function getHeadSha() {
  const data = await api(`/git/ref/heads/${BRANCH}`);
  return data.object.sha;
}

// Step 2: Get the tree SHA from the commit
async function getTreeSha(commitSha) {
  const data = await api(`/git/commits/${commitSha}`);
  return data.tree.sha;
}

// Step 3: Create a blob for each file
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

// Step 4: Create a new tree with all file blobs
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

// Step 5: Create a commit
async function createCommit(message, treeSha, parentSha) {
  const data = await api("/git/commits", {
    method: "POST",
    body: JSON.stringify({
      message,
      tree: treeSha,
      parents: [parentSha],
    }),
  });
  return data.sha;
}

// Step 6: Update the branch ref
async function updateRef(commitSha) {
  await api(`/git/refs/heads/${BRANCH}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commitSha, force: false }),
  });
}

// ── Main ──────────────────────────────────────────────────────────────────
console.log(`\n🚀 Pushing to ${OWNER}/${REPO} (${BRANCH}) via Git Data API...\n`);

// Get current HEAD
process.stdout.write("  Getting HEAD commit... ");
const headSha = await getHeadSha();
console.log(headSha.slice(0, 7));

process.stdout.write("  Getting base tree... ");
const baseTreeSha = await getTreeSha(headSha);
console.log(baseTreeSha.slice(0, 7));

// Create blobs for all files
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

// Create new tree
process.stdout.write(`\n  Creating tree with ${fileBlobs.length} files... `);
const newTreeSha = await createTree(baseTreeSha, fileBlobs);
console.log(newTreeSha.slice(0, 7));

// Create commit
process.stdout.write("  Creating commit... ");
const newCommitSha = await createCommit(
  "feat: add Night Market Friendly Toilets layer + flat JSON storage schema\n\n- 45-entry friendly_toilets.json with WGS84 coords\n- FriendlyToiletLayer component with green markers and popups\n- Toggle button in header\n- Flat storage schema {bookmarks, notes, todos}\n- github-storage.ts rewritten with schema translation",
  newTreeSha,
  headSha
);
console.log(newCommitSha.slice(0, 7));

// Update branch ref
process.stdout.write(`  Updating refs/heads/${BRANCH}... `);
await updateRef(newCommitSha);
console.log("done");

console.log(`\n✅ Successfully pushed commit ${newCommitSha.slice(0, 7)} to ${OWNER}/${REPO}/${BRANCH}`);
