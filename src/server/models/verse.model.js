import { Schema, model, models } from "mongoose";

const VerseSchema = new Schema({
  reference: { type: String, required: true, unique: true, trim: true },
  text: { type: String, required: true },
  version: { type: String, default: "WEB" },
  topic: { type: String, required: true },
});

export const Verse = models.Verse ?? model("Verse", VerseSchema);
