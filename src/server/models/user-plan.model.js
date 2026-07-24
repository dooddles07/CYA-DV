import { Schema, model, models } from "mongoose";

const UserPlanSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    planSlug: { type: String, required: true, trim: true },
    // 1-based day numbers the user has marked complete.
    completedDays: { type: [Number], default: [] },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// A user enrolls in a given plan once; re-enrolling reuses the same document.
UserPlanSchema.index({ userId: 1, planSlug: 1 }, { unique: true });

export const UserPlan = models.UserPlan ?? model("UserPlan", UserPlanSchema);
