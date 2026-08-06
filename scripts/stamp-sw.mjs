// Stamps public/sw.js's cache name with the current deploy's git SHA, so a
// new deploy gets a fresh cache and activate's cleanup evicts the previous
// deploy's entries automatically. Runs as `build`'s prebuild step; local
// `next dev` is unaffected. Vercel builds are ephemeral, so this never
// dirties the tracked file outside a deliberate local `npm run build`.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const SW_PATH = new URL("../public/sw.js", import.meta.url);

function buildId() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 12);
  try {
    return execFileSync("git", ["rev-parse", "--short=12", "HEAD"]).toString().trim();
  } catch {
    return String(Date.now());
  }
}

const source = readFileSync(SW_PATH, "utf8");
const stamped = source.replace(/cya-__BUILD_ID__|cya-[0-9a-f]{6,12}/, `cya-${buildId()}`);
writeFileSync(SW_PATH, stamped);
console.log(`stamp-sw: cache name set to cya-${buildId()}`);
