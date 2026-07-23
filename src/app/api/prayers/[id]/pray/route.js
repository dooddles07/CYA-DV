import { pray } from "@/server/controllers/prayer.controller";

export async function POST(req, { params }) {
  const { id } = await params;
  return pray(req, id);
}
