import { Schema, model, models } from "mongoose";

const RateHitSchema = new Schema({
  key: { type: String, required: true, index: true },
  at: { type: Date, required: true, default: Date.now },
});

// Mongo evicts old hits on its own, so nothing has to sweep this collection.
// INVARIANT: this MUST stay >= the largest rateLimit() windowMs, or the TTL
// sweep can evict hits still inside an open window and under-count. The longest
// window today is auth:register at 1h; 24h leaves wide headroom for new windows.
RateHitSchema.index({ at: 1 }, { expireAfterSeconds: 86400 });

export const RateHit = models.RateHit ?? model("RateHit", RateHitSchema);
