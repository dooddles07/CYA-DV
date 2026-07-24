import { prayers, moderatePrayer, users, setRole } from "@/server/controllers/admin.controller";

export const listAdminPrayers = prayers; // GET   /api/admin/prayers
export const moderatePrayerById = async (req, { params }) => moderatePrayer(req, (await params).id); // PATCH /api/admin/prayers/:id
export const listUsers = users; // GET   /api/admin/users
export const setUserRole = async (req, { params }) => setRole(req, (await params).id); // PATCH /api/admin/users/:id
