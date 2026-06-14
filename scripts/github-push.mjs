/**
 * Pushes changed files directly to GitHub via the Contents API.
 * Bypasses git credential manager entirely.
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const TOKEN = "REDACTED_GITHUB_PAT";
const OWNER = "chenricky";
const REPO  = "taiwan-maps";
const BRANCH = "master";

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

async function getFileSha(path) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/vnd.github.v3+json",
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`GET ${path} → ${res.status}: ${t}`);
  }
  const data = await res.json();
  return data.sha;
}

async function pushFile(repoPath) {
  const localPath = resolve(ROOT, repoPath);
  if (!existsSync(localPath)) {
    console.log(`  SKIP (not found locally): ${repoPath}`);
    return;
  }

  const content = readFileSync(localPath);
  const b64 = content.toString("base64");

  const sha = await getFileSha(repoPath);

  const body = {
    message: `chore: update ${repoPath}`,
    content: b64,
    branch: BRANCH,
  };
  if (sha) body.sha = sha;

  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${repoPath}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`PUT ${repoPath} → ${res.status}: ${t}`);
  }

  const result = await res.json();
  console.log(`  ✓ ${repoPath} → ${result.commit?.sha?.slice(0, 7)}`);
}

console.log(`Pushing ${FILES_TO_PUSH.length} files to ${OWNER}/${REPO} (${BRANCH})...\n`);

for (const f of FILES_TO_PUSH) {
  process.stdout.write(`  Pushing ${f} ... `);
  try {
    await pushFile(f);
  } catch (err) {
    console.error(`\n  ✗ FAILED: ${err.message}`);
    process.exit(1);
  }
}

console.log("\n✅ All files pushed successfully!");
