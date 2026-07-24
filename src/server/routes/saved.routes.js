import { index, toggle, remove } from "@/server/controllers/saved-verse.controller";

export const listSaved = index; // GET    /api/saved
export const toggleSaved = toggle; // POST   /api/saved
export const removeSaved = remove; // DELETE /api/saved
