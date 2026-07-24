import { enroll, completeDay, leave } from "@/server/controllers/plan.controller";

export const enrollPlan = enroll; // POST /api/plans/enroll
export const completePlanDay = completeDay; // POST /api/plans/day
export const leavePlan = leave; // POST /api/plans/leave
