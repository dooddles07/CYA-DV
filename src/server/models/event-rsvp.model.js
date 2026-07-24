import { Schema, model, models } from "mongoose";

// One row per (event, user): the source of truth for the RSVP headcount, so a
// count can't be inflated and the "I'm coming" state survives a refresh.
const EventRsvpSchema = new Schema(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

// A user can RSVP to a given event at most once.
EventRsvpSchema.index({ eventId: 1, userId: 1 }, { unique: true });

export const EventRsvp = models.EventRsvp ?? model("EventRsvp", EventRsvpSchema);
