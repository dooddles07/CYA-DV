import { Schema, model, models } from "mongoose";

const DevotionSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 80 },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    excerpt: { type: String, default: "", trim: true, maxlength: 400 },
    author: { type: String, default: "", trim: true, maxlength: 80 },
    readTime: { type: String, default: "3 min", trim: true, maxlength: 20 },
    // Human display date, e.g. "July 17, 2026". Ordering uses createdAt.
    date: { type: String, default: "", trim: true, maxlength: 40 },
    verse: { type: String, default: "", trim: true, maxlength: 80 },
    verseText: { type: String, default: "", trim: true, maxlength: 500 },
    // Either a bundled /media asset or an uploaded /api/images/<id> pubmat.
    image: { type: String, default: "/media/tree-guitar.jpg", trim: true, maxlength: 300 },
    imageAlt: { type: String, default: "", trim: true, maxlength: 200 },
    body: { type: [String], default: [] },
    practice: { type: String, default: "", trim: true, maxlength: 600 },
    published: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Public list reads published devotions newest-first; serve filter + sort together.
DevotionSchema.index({ published: 1, createdAt: -1 });

export const Devotion = models.Devotion ?? model("Devotion", DevotionSchema);
