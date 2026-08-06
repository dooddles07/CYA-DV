import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

// Env must be set before any app module calls dbConnect(). MongoMemoryServer
// gives a throwaway mongod, so these hit real Mongoose queries and indexes
// without a shared database.
let mem;
before(async () => {
  process.env.AUTH_SECRET = "test-secret-for-integration-tests";
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
  const [auth, user, users, dates, model, mfa] = await Promise.all([
    import("@/server/services/auth.service.js"),
    import("@/server/services/user.service.js"),
    import("@/server/services/user.service.js"),
    import("@/server/utils/dates.js"),
    import("@/server/models/user.model.js"),
    import("@/server/services/mfa.service.js"),
  ]);
  mod = { ...auth, ...user, ...users, ...dates, User: model.User, ...mfa };
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

// --- mfa.service -------------------------------------------------------------

test("beginEnrollment stores an encrypted secret and returns 10 backup codes", async () => {
  const { registerUser, setUserRole, beginEnrollment } = await app();
  const u = await registerUser({ name: "Ada", email: "ada@example.com", password: "supersecret" });
  await setUserRole(u.id, "admin");
  const enrollment = await beginEnrollment(u.id);
  assert.match(enrollment.otpauthUri, /^otpauth:\/\/totp\//);
  assert.equal(enrollment.backupCodes.length, 10);
});

test("beginEnrollment rejects a non-admin account", async () => {
  const { registerUser, beginEnrollment } = await app();
  const u = await registerUser({ name: "Mem", email: "member@example.com", password: "supersecret" });
  await assert.rejects(beginEnrollment(u.id), /admin accounts only/);
});

test("confirmEnrollment accepts the current TOTP code and enables MFA", async () => {
  const { registerUser, setUserRole, beginEnrollment, confirmEnrollment, User } = await app();
  const { decryptSecret, totpCode } = await import("@/server/utils/totp.js");
  const u = await registerUser({ name: "Ada", email: "ada2@example.com", password: "supersecret" });
  await setUserRole(u.id, "admin");
  await beginEnrollment(u.id);

  const stored = await User.findById(u.id);
  const code = totpCode(decryptSecret(stored.totpSecret));
  await confirmEnrollment(u.id, code);

  const after = await User.findById(u.id);
  assert.equal(after.totpEnabled, true);
});

test("confirmEnrollment rejects a wrong code", async () => {
  const { registerUser, setUserRole, beginEnrollment, confirmEnrollment } = await app();
  const u = await registerUser({ name: "Ada", email: "ada3@example.com", password: "supersecret" });
  await setUserRole(u.id, "admin");
  await beginEnrollment(u.id);
  await assert.rejects(confirmEnrollment(u.id, "000000"), /didn't match/);
});

test("verifyMemberCode consumes a backup code exactly once", async () => {
  const { registerUser, setUserRole, beginEnrollment, confirmEnrollment, verifyMemberCode, User } = await app();
  const { decryptSecret, totpCode } = await import("@/server/utils/totp.js");
  const u = await registerUser({ name: "Ada", email: "ada4@example.com", password: "supersecret" });
  await setUserRole(u.id, "admin");
  const { backupCodes } = await beginEnrollment(u.id);

  const stored = await User.findById(u.id);
  await confirmEnrollment(u.id, totpCode(decryptSecret(stored.totpSecret)));

  const code = backupCodes[0];
  await verifyMemberCode(u.id, { backupCode: code });
  await assert.rejects(verifyMemberCode(u.id, { backupCode: code }), /not valid/);
});

test("verifyPortalCode checks against ADMIN_PORTAL_TOTP_SECRET", async () => {
  const { verifyPortalCode } = await app();
  const { generateSecret, totpCode } = await import("@/server/utils/totp.js");
  const secret = generateSecret();
  process.env.ADMIN_PORTAL_TOTP_SECRET = secret;
  try {
    assert.equal(await verifyPortalCode({ code: totpCode(secret) }), true);
    await assert.rejects(verifyPortalCode({ code: "000000" }), /didn't match/);
  } finally {
    delete process.env.ADMIN_PORTAL_TOTP_SECRET;
  }
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
