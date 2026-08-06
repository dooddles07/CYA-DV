/**
 * Seeds one fixture admin-role account for local dev and the Playwright E2E
 * suite. Only ever invoked by dev-local.mjs against the disposable in-memory
 * database (see its MONGO_URL argument) — never wired into `npm run seed`,
 * which also runs against production, so this credential never reaches a
 * real database.
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

// Matched verbatim by tests/e2e/admin-mfa.spec.ts.
const EMAIL = "e2e-admin@example.com";
const PASSWORD = "e2e-admin-pass-1234";

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
      $set: { name: "E2E Admin", passwordHash, role: "admin", emailVerified: true },
      // Only applied on first creation — a real registration goes through the
      // app's own schema defaults (User.create()); this upsert bypasses that,
      // so these must be spelled out explicitly or reads via .lean() (e.g.
      // getUserStats()) see `undefined` instead of 0 and crash the dashboard.
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
  console.log(`Admin fixture ready: ${EMAIL}`);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("Admin fixture seed failed:", err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
