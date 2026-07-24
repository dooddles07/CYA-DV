import { Schema, model, models } from "mongoose";

const SavedVerseSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    reference: { type: String, required: true, trim: true },
    text: { type: String, required: true },
    version: { type: String, default: "BSB" },
    topic: { type: String, default: "" },
  },
  { timestamps: true }
);

// One save per verse per user; makes the toggle idempotent.
SavedVerseSchema.index({ userId: 1, reference: 1 }, { unique: true });

export const SavedVerse = models.SavedVerse ?? model("SavedVerse", SavedVerseSchema);
