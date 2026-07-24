import { Schema, model, models } from "mongoose";

/**
 * Uploaded event artwork (pubmats) stored in Mongo rather than on disk —
 * Railway's filesystem is ephemeral, so anything written there is lost on
 * the next deploy. Images are compressed client-side before upload.
 */
const EventImageSchema = new Schema(
  {
    data: { type: Buffer, required: true },
    contentType: { type: String, required: true },
    bytes: { type: Number, required: true },
    originalName: { type: String, default: "", maxlength: 200 },
  },
  { timestamps: true }
);

export const EventImage = models.EventImage ?? model("EventImage", EventImageSchema);
