/** Admin-only surfaces: portal auth, events CRUD, moderation, users, sync. */
export const adminRoutes = {
  "POST /api/admin/portal/login": "admin-auth.controller#portalLogin",
  "POST /api/admin/portal/logout": "admin-auth.controller#portalLogout",
  "POST /api/admin/events/image": "image.controller#upload",
  "GET  /api/admin/events": "event.controller#index",
  "POST /api/admin/events": "event.controller#create",
  "PATCH /api/admin/events/:id": "event.controller#update",
  "DELETE /api/admin/events/:id": "event.controller#destroy",
  "GET  /api/admin/prayers": "admin.controller#prayers",
  "PATCH /api/admin/prayers/:id": "admin.controller#moderatePrayer",
  "GET  /api/admin/users": "admin.controller#users",
  "PATCH /api/admin/users/:id": "admin.controller#setRole",
  "POST /api/admin/sync-verses": "sync.controller#syncVerseCorpus",
};
