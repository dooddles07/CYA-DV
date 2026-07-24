import { Schema, model, models } from "mongoose";

const EventSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    // Stored as YYYY-MM-DD; the display string is derived so the two can't drift.
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    time: { type: String, required: true, trim: true, maxlength: 40 },
    location: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, default: "", trim: true, maxlength: 800 },
    speaker: { type: String, default: "", trim: true, maxlength: 120 },
    tag: { type: String, default: "Event", trim: true, maxlength: 40 },
    // Either a bundled /media asset or an uploaded /api/images/<id> pubmat.
    image: { type: String, default: "/media/stage-event.jpg", trim: true, maxlength: 300 },
    published: { type: Boolean, default: true },
    // Denormalised RSVP headcount; the source of truth is the EventRsvp rows.
    rsvpCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

EventSchema.index({ date: 1 });

export const Event = models.Event ?? model("Event", EventSchema);
