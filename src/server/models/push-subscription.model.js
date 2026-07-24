import { Schema, model, models } from "mongoose";

const PushSubscriptionSchema = new Schema(
  {
    // Null for signed-out devices — they still get the daily verse.
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
  },
  { timestamps: true }
);

export const PushSubscription =
  models.PushSubscription ?? model("PushSubscription", PushSubscriptionSchema);
