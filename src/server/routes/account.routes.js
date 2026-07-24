import { exportData, remove } from "@/server/controllers/account.controller";

export const exportUserData = exportData; // GET    /api/account/export
export const deleteAccount = remove; // DELETE /api/account
