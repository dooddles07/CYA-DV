import { Schema, model, models } from "mongoose";

const RateHitSchema = new Schema({
  key: { type: String, required: true, index: true },
  at: { type: Date, required: true, default: Date.now },
});

// Mongo evicts old hits on its own, so nothing has to sweep this collection.
RateHitSchema.index({ at: 1 }, { expireAfterSeconds: 3600 });

export const RateHit = models.RateHit ?? model("RateHit", RateHitSchema);
