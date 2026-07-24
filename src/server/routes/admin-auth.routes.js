import { portalLogin, portalLogout } from "@/server/controllers/admin-auth.controller";

export const login = portalLogin; // POST /api/admin/portal/login
export const logout = portalLogout; // POST /api/admin/portal/logout
