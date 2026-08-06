/**
 * One-command local development.
 *
 *   npm run dev:local
 *
 * The production MONGO_URL points at a MongoDB Atlas cluster reachable only
 * with production credentials — so a plain `npm run dev` cannot reach a
 * database. This script stands up a local MongoDB
 * (mongodb-memory-server), keeps its data on disk under .dev-db so it survives
 * restarts, seeds the verse corpus once, then launches `next dev` pointed at it.
 *
 * If a previous dev:local is still running (mongod already listening on the
 * fixed port), this reuses that instance instead of crashing on the held lock.
 *
 * Nothing here touches .env or the production database.
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { createConnection } from "node:net";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { MongoMemoryServer } from "mongodb-memory-server";

const MONGO_PORT = 27099;
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dbPath = join(root, ".dev-db");
mkdirSync(dbPath, { recursive: true });

let mongo = null; // set only when this process owns the mongod
let uri;

if (await portInUse(MONGO_PORT)) {
  // A prior dev:local (or another mongod) already holds the port and the
  // .dev-db lock. Starting a second mongod on the same path crashes at boot,
  // so reuse the running one instead.
  uri = `mongodb://127.0.0.1:${MONGO_PORT}/cya`;
  console.log(`Reusing local MongoDB already on :${MONGO_PORT}`);
  console.log(`  ${uri}`);
} else {
  console.log("Starting local MongoDB...");
  try {
    mongo = await MongoMemoryServer.create({
      instance: { port: MONGO_PORT, dbName: "cya", dbPath, storageEngine: "wiredTiger" },
    });
  } catch (err) {
    console.error(
      `\nFailed to start local MongoDB on :${MONGO_PORT}.\n` +
        "If a previous dev:local crashed, a stale lock may remain in .dev-db.\n" +
        "Kill any leftover mongod process, or delete .dev-db, then retry.\n"
    );
    console.error(String(err?.message ?? err));
    process.exit(1);
  }
  uri = mongo.getUri("cya");
  console.log(`  MongoDB ready: ${uri}`);
}

// Seed verses (idempotent upsert — safe every boot).
await run("node", ["scripts/seed.mjs"], { MONGO_URL: uri });
// Seed the E2E/dev admin fixture (dev-local only — never wired into the
// production-facing `npm run seed` script).
await run("node", ["scripts/seed-e2e-admin.mjs"], { MONGO_URL: uri });

console.log("Starting next dev...\n");
const dev = spawn("npx", ["next", "dev"], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, MONGO_URL: uri },
});

let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  dev.kill();
  // Only stop the mongod we started; never kill a reused external instance.
  if (mongo) await mongo.stop();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
dev.on("exit", shutdown);

// Resolves true if something is already listening on the port.
function portInUse(port) {
  return new Promise((resolve) => {
    const sock = createConnection({ port, host: "127.0.0.1" });
    sock.once("connect", () => {
      sock.destroy();
      resolve(true);
    });
    sock.once("error", () => resolve(false));
  });
}

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
