import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

// Env must be set before any app module calls dbConnect(). MongoMemoryServer
// gives a throwaway mongod, so these hit real Mongoose queries and indexes
// without a shared database.
let mem;
before(async () => {
  mem = await MongoMemoryServer.create();
  process.env.MONGO_URL = mem.getUri();
  const { dbConnect } = await import("@/server/config/db.js");
  await dbConnect();
});

after(async () => {
  await mongoose.disconnect();
  await mem?.stop();
});

// Imported after the env is wired, but static imports run first, so pull the
// app modules dynamically inside the tests via a small cached loader.
let mod;
async function app() {
  if (mod) return mod;
  const [auth, user, users, dates, model] = await Promise.all([
    import("@/server/services/auth.service.js"),
    import("@/server/services/user.service.js"),
    import("@/server/services/user.service.js"),
    import("@/server/utils/dates.js"),
    import("@/server/models/user.model.js"),
  ]);
  mod = { ...auth, ...user, ...users, ...dates, User: model.User };
  return mod;
}

beforeEach(async () => {
  const { User } = await app();
  await User.deleteMany({});
});

// --- auth.service ---------------------------------------------------------

test("registerUser creates an account with a fresh token version", async () => {
  const { registerUser } = await app();
  const u = await registerUser({ name: "Grace", email: "Grace@Example.com", password: "supersecret" });
  assert.ok(u.id);
  assert.equal(u.email, "grace@example.com"); // normalized
  assert.equal(u.tokenVersion, 0);
});

test("registerUser rejects a duplicate email", async () => {
  const { registerUser } = await app();
  await registerUser({ name: "Grace", email: "dup@example.com", password: "supersecret" });
  await assert.rejects(
    registerUser({ name: "Other", email: "dup@example.com", password: "supersecret" }),
    /already exists/
  );
});

test("registerUser rejects a short password", async () => {
  const { registerUser } = await app();
  await assert.rejects(
    registerUser({ name: "Grace", email: "short@example.com", password: "1234" }),
    /at least 8/
  );
});

test("loginUser accepts the right password and rejects the wrong one", async () => {
  const { registerUser, loginUser } = await app();
  await registerUser({ name: "Grace", email: "login@example.com", password: "supersecret" });

  const ok = await loginUser({ email: "login@example.com", password: "supersecret" });
  assert.equal(ok.email, "login@example.com");

  await assert.rejects(
    loginUser({ email: "login@example.com", password: "wrongpass" }),
    /Invalid email or password/
  );
});

// --- user.service: streak -------------------------------------------------

async function newUser(email = "streak@example.com") {
  const { registerUser } = await app();
  return registerUser({ name: "Grace", email, password: "supersecret" });
}

test("first read starts a streak of 1 and awards a read", async () => {
  const { markVerseRead } = await app();
  const u = await newUser();
  const r = await markVerseRead(u.id);
  assert.equal(r.alreadyRead, false);
  assert.equal(r.streak, 1);
  assert.equal(r.totalReads, 1);
});

test("a second read on the same day is idempotent", async () => {
  const { markVerseRead } = await app();
  const u = await newUser();
  await markVerseRead(u.id);
  const again = await markVerseRead(u.id);
  assert.equal(again.alreadyRead, true);
  assert.equal(again.streak, 1);
  assert.equal(again.totalReads, 1); // not double-counted
});

test("reading the day after yesterday extends the streak", async () => {
  const { markVerseRead, manilaDayKey, keyFromDayNumber, dayNumber, User } = await app();
  const u = await newUser();
  const yesterday = keyFromDayNumber(dayNumber(manilaDayKey()) - 1);
  await User.findByIdAndUpdate(u.id, { $set: { streak: 4, bestStreak: 4, lastReadDate: yesterday } });

  const r = await markVerseRead(u.id);
  assert.equal(r.streak, 5);
  assert.equal(r.bestStreak, 5);
});

test("a gap of more than a day resets the streak to 1", async () => {
  const { markVerseRead, manilaDayKey, keyFromDayNumber, dayNumber, User } = await app();
  const u = await newUser();
  const threeDaysAgo = keyFromDayNumber(dayNumber(manilaDayKey()) - 3);
  await User.findByIdAndUpdate(u.id, { $set: { streak: 9, bestStreak: 9, lastReadDate: threeDaysAgo } });

  const r = await markVerseRead(u.id);
  assert.equal(r.streak, 1);
  assert.equal(r.bestStreak, 9); // best is preserved
});
