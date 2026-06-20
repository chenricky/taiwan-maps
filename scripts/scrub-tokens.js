/**
 * scrub-tokens.js
 * Run by git filter-branch --tree-filter to replace hardcoded secrets
 * with placeholder strings in the affected script files.
 */
const fs   = require("fs");
const path = require("path");

const REPLACEMENTS = [
  // github_pat token (old)
  {
    pattern: /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/g,
    replacement: "REDACTED_GITHUB_PAT",
  },
  // ghp_ token
  {
    pattern: /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/g,
    replacement: "REDACTED_GITHUB_TOKEN",
  },
  // Vercel token
  {
    pattern: /vcp_8ZuXS1nmNLY0YYLrq5SdxIvdL2woscTjOBqo8BcQVIPsIxtcB70WWBYn/g,
    replacement: "REDACTED_VERCEL_TOKEN",
  },
];

const FILES = [
  "scripts/github-push.mjs",
  "scripts/github-git-push.mjs",
  "scripts/check-userdata.mjs",
  "scripts/push-tourist-layer.mjs",
  "scripts/trigger-deploy.mjs",
  "scripts/vercel-deploy.mjs",
  "scripts/full-push.mjs",
];

for (const file of FILES) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, "utf-8");
  let changed = false;
  for (const { pattern, replacement } of REPLACEMENTS) {
    const next = content.replace(pattern, replacement);
    if (next !== content) { content = next; changed = true; }
  }
  if (changed) {
    fs.writeFileSync(file, content, "utf-8");
    console.log(`  scrubbed: ${file}`);
  }
}
