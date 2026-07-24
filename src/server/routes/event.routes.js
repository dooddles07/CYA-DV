/** Public events list, RSVP, and image serving. */
export const eventRoutes = {
  "GET  /api/events": "event.controller#upcoming",
  "POST /api/events/:id/rsvp": "event.controller#rsvp",
  "GET  /api/images/:id": "image.controller#serve",
};
