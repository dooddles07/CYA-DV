import { Schema, model, models } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
    passwordHash: { type: String, required: true },
    xp: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    bestStreak: { type: Number, default: 0 },
    // Manila-timezone day key, YYYY-MM-DD.
    lastReadDate: { type: String, default: null },
  },
  { timestamps: true }
);

export const User = models.User ?? model("User", UserSchema);
