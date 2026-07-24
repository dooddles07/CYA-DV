import { serve } from "@/server/controllers/image.controller";

export async function GET(req, { params }) {
  const { id } = await params;
  return serve(req, id);
}
