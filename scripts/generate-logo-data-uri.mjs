/**
 * Regenerates src/server/config/logo-data-uri.js from public/media/cya-logo.png.
 * Run this after replacing the logo file.
 */
import fs from "node:fs";

const LOGO_PATH = "public/media/cya-logo.png";
const OUT_PATH = "src/server/config/logo-data-uri.js";

const bytes = fs.readFileSync(LOGO_PATH);
const b64 = bytes.toString("base64");

const comment = [
  "// Precomputed base64 of public/media/cya-logo.png. Generated, not hand-edited.",
  "// Regenerate with: node scripts/generate-logo-data-uri.mjs",
  "//",
  "// Embedded as a source constant (not read from disk at request time) so email",
  "// sending never depends on the public/ directory being present in the",
  "// serverless function bundle - Vercel serves public/ via CDN, separate from",
  "// the function filesystem, so a runtime fs.readFileSync there is not reliable.",
  "",
].join("\n");

fs.writeFileSync(OUT_PATH, `${comment}export const CYA_LOGO_DATA_URI = "data:image/png;base64,${b64}";\n`);
console.log(`Wrote ${OUT_PATH} (${b64.length} base64 chars from ${bytes.length}-byte source).`);
