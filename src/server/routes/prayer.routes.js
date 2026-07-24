import { index, create, pray } from "@/server/controllers/prayer.controller";

export const listPrayers = index; // GET  /api/prayers
export const createPrayer = create; // POST /api/prayers
export const prayForPrayer = async (req, { params }) => pray(req, (await params).id); // POST /api/prayers/:id/pray
