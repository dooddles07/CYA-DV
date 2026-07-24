import { index, create, update, destroy } from "@/server/controllers/devotion.controller";

export const listDevotions = index; // GET    /api/admin/devotions
export const createDevotion = create; // POST   /api/admin/devotions
export const updateDevotion = async (req, { params }) => update(req, (await params).id); // PATCH  /api/admin/devotions/:id
export const deleteDevotion = async (req, { params }) => destroy(req, (await params).id); // DELETE /api/admin/devotions/:id
