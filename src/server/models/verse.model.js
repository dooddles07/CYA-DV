import { Schema, model, models } from "mongoose";

const VerseSchema = new Schema({
  reference: { type: String, required: true, unique: true, trim: true },
  text: { type: String, required: true },
  version: { type: String, default: "WEB" },
  topic: { type: String, required: true },
});

// Word-based search index for keyword lookups; reference weighted highest so a
// verse address ranks above an incidental word match. One text index per
// collection, so text + reference share it.
VerseSchema.index(
  { reference: "text", text: "text" },
  { weights: { reference: 10, text: 5 }, name: "verse_search" }
);
// Backs topic-filtered search and the per-topic counts aggregation.
VerseSchema.index({ topic: 1 });

export const Verse = models.Verse ?? model("Verse", VerseSchema);
