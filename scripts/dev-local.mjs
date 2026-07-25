/**
 * One-command local development.
 *
 *   npm run dev:local
 *
 * The production MONGO_URL points at Railway's private host
 * (mongodb.railway.internal), which only resolves inside Railway — so a plain
 * `npm run dev` cannot reach a database. This script stands up a local MongoDB
 * (mongodb-memory-server), keeps its data on disk under .dev-db so it survives
 * restarts, seeds the verse corpus once, then launches `next dev` pointed at it.
 *
 * Nothing here touches .env or the production database.
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { MongoMemoryServer } from "mongodb-memory-server";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dbPath = join(root, ".dev-db");
mkdirSync(dbPath, { recursive: true });

console.log("Starting local MongoDB...");
const mongo = await MongoMemoryServer.create({
  instance: { port: 27099, dbName: "cya", dbPath, storageEngine: "wiredTiger" },
});
const uri = mongo.getUri("cya");
console.log(`  MongoDB ready: ${uri}`);

// Seed verses (idempotent upsert — safe every boot).
await run("node", ["scripts/seed.mjs"], { MONGO_URL: uri });

console.log("Starting next dev...\n");
const dev = spawn("npx", ["next", "dev"], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, MONGO_URL: uri },
});

async function shutdown() {
  dev.kill();
  await mongo.stop();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
dev.on("exit", shutdown);

function run(cmd, args, extraEnv) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, {
      cwd: root,
      stdio: "inherit",
      shell: process.platform === "win32",
      env: { ...process.env, ...extraEnv },
    });
    p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}
