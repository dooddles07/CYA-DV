/** Account self-service: data export and deletion (Data Privacy Act rights). */
export const accountRoutes = {
  "GET  /api/account/export": "account.controller#exportData",
  "DELETE /api/account": "account.controller#remove",
};
