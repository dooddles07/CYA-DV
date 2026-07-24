import { Schema, model, models } from "mongoose";

const ResetTokenSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  // SHA-256 of the emailed token — a database leak must not yield usable tokens.
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date, default: null },
});

// Mongo removes expired tokens on its own.
ResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ResetToken = models.ResetToken ?? model("ResetToken", ResetTokenSchema);
