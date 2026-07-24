import {
  upcoming,
  rsvp,
  index,
  create,
  update,
  destroy,
} from "@/server/controllers/event.controller";

export const listEvents = upcoming; // GET  /api/events
export const rsvpEvent = async (req, { params }) => rsvp(req, (await params).id); // POST /api/events/:id/rsvp
export const listAdminEvents = index; // GET  /api/admin/events
export const createEvent = create; // POST /api/admin/events
export const updateEvent = async (req, { params }) => update(req, (await params).id); // PATCH  /api/admin/events/:id
export const deleteEvent = async (req, { params }) => destroy(req, (await params).id); // DELETE /api/admin/events/:id
