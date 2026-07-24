/** Reading plans. */
export const planRoutes = {
  "POST /api/plans/enroll": "plan.controller#enroll",
  "POST /api/plans/day": "plan.controller#completeDay",
  "POST /api/plans/leave": "plan.controller#leave",
};
