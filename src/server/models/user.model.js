import { Schema, model, models } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
    passwordHash: { type: String, required: true },
    // Set once the user confirms ownership of their address via the emailed
    // link. Gates actions that need accountability, e.g. posting to the wall.
    emailVerified: { type: Boolean, default: false },
    // Bumped on password reset to invalidate every existing JWT session.
    tokenVersion: { type: Number, default: 0 },
    role: { type: String, enum: ["member", "admin"], default: "member" },
    // TOTP secret, AES-256-GCM encrypted (see src/server/utils/totp.js).
    // Populated once MFA enrollment starts; only trusted once totpEnabled is true.
    totpSecret: { type: String, default: null },
    totpEnabled: { type: Boolean, default: false },
    // SHA-256 hashes of unused one-time backup codes; entries are removed on use.
    backupCodeHashes: { type: [String], default: [] },
    xp: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    bestStreak: { type: Number, default: 0 },
    // Lifetime count of days this user read the verse — powers community totals.
    totalReads: { type: Number, default: 0 },
    // Manila-timezone day key, YYYY-MM-DD.
    lastReadDate: { type: String, default: null },
    // Manila day keys on which challenge XP was claimed, to keep it once-per-day.
    challengeDates: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const User = models.User ?? model("User", UserSchema);
