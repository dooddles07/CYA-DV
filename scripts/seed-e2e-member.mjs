/**
 * Seeds one fixture email-verified member account for the Playwright E2E
 * suite. Only ever invoked by dev-local.mjs against the disposable in-memory
 * database — never wired into `npm run seed`, which also runs against
 * production, so this credential never reaches a real database.
 *
 * A freshly registered account is unverified (no SMTP in dev-local), so any
 * flow gated on emailVerified (e.g. posting to the prayer wall) is otherwise
 * untestable end-to-end without this fixture. Mirrors seed-e2e-admin.mjs.
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
    passwordHash: { type: String, required: true },
    emailVerified: { type: Boolean, default: false },
    role: { type: String, enum: ["member", "admin"], default: "member" },
  },
  { timestamps: true, strict: false }
);

// Matched verbatim by tests/e2e/prayer.spec.ts.
const EMAIL = "e2e-member@example.com";
const PASSWORD = "e2e-member-pass-1234";

async function main() {
  const url = process.env.MONGO_URL;
  if (!url) {
    console.error("MONGO_URL is not set.");
    process.exit(1);
  }

  await mongoose.connect(url, { serverSelectionTimeoutMS: 10000 });
  const User = mongoose.models.User ?? mongoose.model("User", UserSchema);

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  await User.findOneAndUpdate(
    { email: EMAIL },
    {
      $set: { name: "E2E Member", passwordHash, role: "member", emailVerified: true },
      // Only applied on first creation — see seed-e2e-admin.mjs for why these
      // must be spelled out (this upsert bypasses User.create()'s defaults).
      $setOnInsert: {
        tokenVersion: 0,
        xp: 0,
        streak: 0,
        bestStreak: 0,
        totalReads: 0,
        lastReadDate: null,
        challengeDates: [],
      },
    },
    { upsert: true }
  );
  console.log(`Member fixture ready: ${EMAIL}`);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("Member fixture seed failed:", err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
