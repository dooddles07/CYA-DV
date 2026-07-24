/**
 * Creates (or updates) the site owner account and seeds ONE real prayer-wall
 * post authored by that account, connected to the live database.
 *
 *   MONGO_URL='...' OWNER_PASSWORD='your-password' npm run setup:owner
 *
 * Optional overrides: OWNER_EMAIL, OWNER_NAME, OWNER_ROLE (member|admin),
 * PRAYER_NAME, PRAYER_REQUEST.
 *
 * The password is read from the environment and never written to disk or logged.
 * Safe to run repeatedly: the account is upserted by email and the prayer is
 * upserted by author, so nothing duplicates.
 */
import { readFile } from "node:fs/promises";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

function loadEnv(text) {
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["member", "admin"], default: "member" },
  },
  { timestamps: true, strict: false }
);

const PrayerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    name: { type: String, default: "Anonymous", trim: true, maxlength: 60 },
    request: { type: String, required: true, trim: true, minlength: 10, maxlength: 1000 },
    tag: { type: String, default: "New", trim: true, maxlength: 30 },
    status: { type: String, enum: ["approved", "hidden"], default: "approved" },
    prayedCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

async function main() {
  await readFile(".env", "utf8").then(loadEnv).catch(() => {});

  const url = process.env.MONGO_URL;
  const password = process.env.OWNER_PASSWORD;
  if (!url) exit("MONGO_URL is not set. Pass it inline:\n  MONGO_URL='...' OWNER_PASSWORD='...' npm run setup:owner");
  if (!password || password.length < 8) exit("OWNER_PASSWORD is not set (min 8 chars). Pass it inline, do not commit it.");

  const email = (process.env.OWNER_EMAIL ?? "brixdodd07@gmail.com").toLowerCase();
  const name = process.env.OWNER_NAME ?? "Brix Dodd";
  const role = process.env.OWNER_ROLE === "admin" ? "admin" : "member";
  const prayerName = process.env.PRAYER_NAME ?? "Brix";
  const request =
    process.env.PRAYER_REQUEST ??
    "Praying over everyone who opens CYA Daily Verse — that God's Word meets you right where you are today. Kay Kristo, buong buhay!";

  await mongoose.connect(url, { serverSelectionTimeoutMS: 10000 });
  const User = mongoose.models.User ?? mongoose.model("User", UserSchema);
  const Prayer = mongoose.models.Prayer ?? mongoose.model("Prayer", PrayerSchema);

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.findOneAndUpdate(
    { email },
    { $set: { name, passwordHash, role }, $setOnInsert: { email } },
    { new: true, upsert: true }
  );
  console.log(`Account ready: ${user.email} (${user.role}) — id ${user._id}`);

  const prayer = await Prayer.findOneAndUpdate(
    { userId: user._id },
    { $set: { name: prayerName, request, tag: "Launch", status: "approved" }, $setOnInsert: { prayedCount: 0 } },
    { new: true, upsert: true }
  );
  console.log(`Prayer ready: "${prayer.request.slice(0, 48)}..." — id ${prayer._id}`);

  await mongoose.disconnect();
  console.log("Done.");
}

function exit(msg) {
  console.error(msg);
  process.exit(1);
}

main().catch(async (err) => {
  console.error("Setup failed:", err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
