import { upload, serve } from "@/server/controllers/image.controller";

export const uploadImage = upload; // POST /api/admin/events/image
export const serveImage = async (req, { params }) => serve(req, (await params).id); // GET /api/images/:id
