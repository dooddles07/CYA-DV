import { Schema, model, models } from "mongoose";

// One row per (prayer, user): the source of truth for whether a signed-in user
// has prayed, so counts can't be inflated and the state survives a refresh.
const PrayerHitSchema = new Schema(
  {
    prayerId: { type: Schema.Types.ObjectId, ref: "Prayer", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

// A user can pray for a given request at most once.
PrayerHitSchema.index({ prayerId: 1, userId: 1 }, { unique: true });

export const PrayerHit = models.PrayerHit ?? model("PrayerHit", PrayerHitSchema);
