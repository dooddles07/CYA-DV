import { Schema, model, models } from "mongoose";

// One document per (limiter, client, fixed time window). $inc is atomic, so
// concurrent requests increment the same counter without the count-then-insert
// race the old per-hit model had — the limit can no longer be overshot within a
// window. Fixed windows do allow a short burst up to 2x limit right at a bucket
// boundary; that is the accepted tradeoff for exact atomicity on abuse-friction
// limits.
const RateBucketSchema = new Schema({
  _id: { type: String }, // `${name}:${client}:${bucketStart}`
  count: { type: Number, required: true, default: 0 },
  // Mongo drops the doc once its window has elapsed; nothing sweeps manually.
  expiresAt: { type: Date, required: true },
});

RateBucketSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RateBucket = models.RateBucket ?? model("RateBucket", RateBucketSchema);
