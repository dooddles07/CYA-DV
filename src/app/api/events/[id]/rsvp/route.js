import { rsvp } from "@/server/controllers/event.controller";

export const dynamic = "force-dynamic";

export async function POST(req, { params }) {
  const { id } = await params;
  return rsvp(req, id);
}
