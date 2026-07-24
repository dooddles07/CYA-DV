import { index, remove, toggle } from "@/server/controllers/saved-verse.controller";

export const dynamic = "force-dynamic";
export const GET = index;
export const POST = toggle;
export const DELETE = remove;
