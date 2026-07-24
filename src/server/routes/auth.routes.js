import {
  register,
  login,
  logout,
  me,
  forgotPassword,
  resetPassword,
  verifyEmailAddress,
  resendVerificationEmail,
} from "@/server/controllers/auth.controller";

export const signUp = register; // POST /api/auth/register
export const signIn = login; // POST /api/auth/login
export const signOut = logout; // POST /api/auth/logout
export const currentUser = me; // GET  /api/auth/me
export const forgot = forgotPassword; // POST /api/auth/forgot
export const reset = resetPassword; // POST /api/auth/reset
export const verify = verifyEmailAddress; // POST /api/auth/verify
export const resendVerification = resendVerificationEmail; // POST /api/auth/verify/resend
