/**
 * Deploys the taiwan-maps Next.js project directly to Vercel
 * using the Vercel REST API (file upload + deployment creation).
 * No GitHub push required.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { resolve, relative, dirname, join } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const VERCEL_TOKEN  = "REDACTED_VERCEL_TOKEN";
const PROJECT_ID    = "prj_b5PZ3KtMI0gzroKDik7l7YLtwSk4";
const VERCEL_API    = "https://api.vercel.com";

const HEADERS = {
  Authorization: `Bearer ${VERCEL_TOKEN}`,
  "Content-Type": "application/json",
};

// Directories/files to include in deployment
const INCLUDE_PATTERNS = [
  "src",
  "public",
  "package.json",
  "package-lock.json",
  "next.config.ts",
  "tsconfig.json",
  "postcss.config.mjs",
  "eslint.config.mjs",
];

// Files/dirs to always exclude
const EXCLUDE = new Set([
  "node_modules",
  ".next",
  ".git",
  ".vercel",
  "scripts",
  ".env.local",
  ".env",
  "askpass.bat",
  "git-credentials-temp",
]);

function sha1(buf) {
  return createHash("sha1").update(buf).digest("hex");
}

function collectFiles(dir, base = dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    if (EXCLUDE.has(entry)) continue;
    const full = join(dir, entry);
    const rel  = relative(base, full).replace(/\\/g, "/");
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...collectFiles(full, base));
    } else {
      files.push({ full, rel });
    }
  }
  return files;
}

// Collect all files to deploy
const allFiles = [];
for (const pattern of INCLUDE_PATTERNS) {
  const full = resolve(ROOT, pattern);
  if (!existsSync(full)) continue;
  const stat = statSync(full);
  if (stat.isDirectory()) {
    allFiles.push(...collectFiles(full, ROOT));
  } else {
    const rel = relative(ROOT, full).replace(/\\/g, "/");
    allFiles.push({ full, rel });
  }
}

console.log(`\n🚀 Vercel Direct Deployment`);
console.log(`   Project: ${PROJECT_ID}`);
console.log(`   Files:   ${allFiles.length}\n`);

// Step 1: Upload all files
console.log("📤 Uploading files...");
const deployFiles = [];

for (const { full, rel } of allFiles) {
  const content = readFileSync(full);
  const digest  = sha1(content);

  // Upload file
  const uploadRes = await fetch(`${VERCEL_API}/v2/files`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      "Content-Type": "application/octet-stream",
      "x-vercel-digest": digest,
      "Content-Length": String(content.length),
    },
    body: content,
  });

  if (!uploadRes.ok && uploadRes.status !== 409) {
    // 409 = already exists, that's fine
    const t = await uploadRes.text();
    throw new Error(`Upload ${rel} → ${uploadRes.status}: ${t.slice(0, 200)}`);
  }

  deployFiles.push({
    file: rel,
    sha:  digest,
    size: content.length,
  });

  process.stdout.write(".");
}
console.log(`\n   ✓ ${deployFiles.length} files uploaded\n`);

// Step 2: Create deployment
console.log("🏗️  Creating deployment...");

const deployBody = {
  name: "taiwan-maps",
  files: deployFiles,
  target: "production",
  framework: "nextjs",
};

const deployRes = await fetch(`${VERCEL_API}/v13/deployments?projectId=${PROJECT_ID}`, {
  method: "POST",
  headers: HEADERS,
  body: JSON.stringify(deployBody),
});

const deployData = await deployRes.json();

if (!deployRes.ok) {
  console.error("Deployment creation failed:", JSON.stringify(deployData, null, 2));
  process.exit(1);
}

const deployId  = deployData.id;
const deployUrl = deployData.url;

console.log(`   ✓ Deployment created: ${deployId}`);
console.log(`   URL: https://${deployUrl}\n`);

// Step 3: Poll for completion
console.log("⏳ Waiting for build to complete...");
let attempts = 0;
const MAX_ATTEMPTS = 60; // 5 minutes

while (attempts < MAX_ATTEMPTS) {
  await new Promise(r => setTimeout(r, 5000));
  attempts++;

  const statusRes = await fetch(`${VERCEL_API}/v13/deployments/${deployId}`, {
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
  });
  const statusData = await statusRes.json();
  const state = statusData.readyState || statusData.status;

  process.stdout.write(`\r   State: ${state} (${attempts * 5}s elapsed)   `);

  if (state === "READY") {
    console.log(`\n\n✅ Deployment READY!`);
    console.log(`   🌐 https://${statusData.url}`);
    console.log(`   🌐 https://${statusData.alias?.[0] || deployUrl}`);
    break;
  }

  if (state === "ERROR" || state === "CANCELED") {
    console.error(`\n\n❌ Deployment ${state}`);
    console.error(JSON.stringify(statusData.errorMessage || statusData.error, null, 2));
    process.exit(1);
  }
}

if (attempts >= MAX_ATTEMPTS) {
  console.log(`\n⚠️  Timed out waiting. Check Vercel dashboard for deployment ${deployId}`);
}
