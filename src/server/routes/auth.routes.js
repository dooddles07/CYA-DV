/** Authentication, password reset, and email verification. */
export const authRoutes = {
  "POST /api/auth/register": "auth.controller#register",
  "POST /api/auth/login": "auth.controller#login",
  "POST /api/auth/logout": "auth.controller#logout",
  "GET  /api/auth/me": "auth.controller#me",
  "POST /api/auth/forgot": "auth.controller#forgotPassword",
  "POST /api/auth/reset": "auth.controller#resetPassword",
  "POST /api/auth/verify": "auth.controller#verifyEmailAddress",
  "POST /api/auth/verify/resend": "auth.controller#resendVerificationEmail",
};
