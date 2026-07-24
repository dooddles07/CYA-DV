import { destroy, update } from "@/server/controllers/event.controller";

export async function PATCH(req, { params }) {
  const { id } = await params;
  return update(req, id);
}

export async function DELETE(req, { params }) {
  const { id } = await params;
  return destroy(req, id);
}
