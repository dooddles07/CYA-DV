import { Schema, model, models } from "mongoose";

const PrayerSchema = new Schema(
  {
    // Recorded even for anonymous posts, so moderation has accountability.
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    name: { type: String, default: "Anonymous", trim: true, maxlength: 60 },
    request: { type: String, required: true, trim: true, minlength: 10, maxlength: 1000 },
    tag: { type: String, default: "New", trim: true, maxlength: 30 },
    // "hidden" lets a future admin page moderate without deleting.
    status: { type: String, enum: ["approved", "hidden"], default: "approved" },
    prayedCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

export const Prayer = models.Prayer ?? model("Prayer", PrayerSchema);
