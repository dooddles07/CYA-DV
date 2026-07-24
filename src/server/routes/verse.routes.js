import { today, search } from "@/server/controllers/verse.controller";

export const todayVerse = today; // GET /api/verse/today
export const searchVerses = search; // GET /api/verse/search
