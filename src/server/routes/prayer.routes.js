/** Public prayer wall. */
export const prayerRoutes = {
  "GET  /api/prayers": "prayer.controller#index",
  "POST /api/prayers": "prayer.controller#create",
  "POST /api/prayers/:id/pray": "prayer.controller#pray",
};
