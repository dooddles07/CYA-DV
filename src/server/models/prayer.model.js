import { Schema, model, models } from "mongoose";

const PrayerSchema = new Schema(
  {
    // Recorded even for anonymous posts, so moderation has accountability.
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    name: { type: String, default: "Anonymous", trim: true, maxlength: 60 },
    request: { type: String, required: true, trim: true, minlength: 10, maxlength: 1000 },
    // "hidden" lets a future admin page moderate without deleting.
    status: { type: String, enum: ["approved", "hidden"], default: "approved" },
    prayedCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// The wall reads approved posts newest-first with a createdAt cursor; this
// compound index serves both the filter and the sort without a collection scan.
PrayerSchema.index({ status: 1, createdAt: -1 });

export const Prayer = models.Prayer ?? model("Prayer", PrayerSchema);
