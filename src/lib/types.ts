/** Shapes returned by the JS services in src/server, for TypeScript consumers. */

export type ActivePlan = {
  slug: string;
  name: string;
  tag: string;
  desc: string;
  totalDays: number;
  completedCount: number;
  nextDay: number;
  todayReading: string;
  finished?: boolean;
  upcoming: { day: number; passage: string }[];
  weekProgress: boolean[];
  enrolled: boolean;
};

export type PlanSummary = {
  slug: string;
  name: string;
  tag: string;
  desc: string;
  totalDays: number;
};

export type CommunityStats = {
  readers: number;
  versesRead: number;
  bestStreak: number;
  prayers: number;
};

export type PrayerItem = {
  id: string;
  name: string;
  request: string;
  tag: string;
  prayedCount: number;
  createdAt: string;
};

export type ModeratedPrayer = PrayerItem & { status: "approved" | "hidden" };

export type SavedVerse = {
  reference: string;
  text: string;
  version: string;
  topic: string;
};

export type UserStats = {
  name: string;
  email: string;
  role: "member" | "admin";
  lastReadDate: string | null;
  streak: number;
  bestStreak: number;
  totalReads: number;
  xp: number;
  level: number;
  xpToNext: number;
};
