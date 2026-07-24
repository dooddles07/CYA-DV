import { Schema, model, models } from "mongoose";

// One row per Manila day the daily push was sent. The unique day key makes the
// send idempotent: a retry or overlapping trigger can't claim the same day
// twice, so subscribers never get the verse notification more than once a day.
const PushLogSchema = new Schema(
  {
    // Manila day key, YYYY-MM-DD.
    day: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export const PushLog = models.PushLog ?? model("PushLog", PushLogSchema);
