import { enroll, enrollConfirm, verify } from "@/server/controllers/mfa.controller";

export const startEnrollment = enroll; // POST /api/auth/mfa/enroll
export const confirmEnrollmentRoute = enrollConfirm; // POST /api/auth/mfa/enroll/confirm
export const verifyCode = verify; // POST /api/auth/mfa/verify
