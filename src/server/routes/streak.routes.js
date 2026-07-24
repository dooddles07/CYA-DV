import { markRead, challenge } from "@/server/controllers/streak.controller";

export const markVerseRead = markRead; // POST /api/streak/read
export const claimChallenge = challenge; // POST /api/streak/challenge
