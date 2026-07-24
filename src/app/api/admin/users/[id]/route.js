import { setRole } from "@/server/controllers/admin.controller";

export async function PATCH(req, { params }) {
  const { id } = await params;
  return setRole(req, id);
}
