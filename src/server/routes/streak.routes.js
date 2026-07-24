/** Reading streak and daily challenges. */
export const streakRoutes = {
  "POST /api/streak/read": "streak.controller#markRead",
  "POST /api/streak/challenge": "streak.controller#challenge",
};
