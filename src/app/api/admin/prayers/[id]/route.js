import { moderatePrayer } from "@/server/controllers/admin.controller";

export async function PATCH(req, { params }) {
  const { id } = await params;
  return moderatePrayer(req, id);
}
