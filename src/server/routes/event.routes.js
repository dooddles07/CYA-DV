/** Public events list and image serving. */
export const eventRoutes = {
  "GET  /api/events": "event.controller#upcoming",
  "GET  /api/images/:id": "image.controller#serve",
};
