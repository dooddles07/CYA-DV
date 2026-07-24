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
  // Whether the current signed-in user has prayed for this request.
  prayed: boolean;
  createdAt: string;
};

export type ModeratedPrayer = PrayerItem & { status: "approved" | "hidden" };

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "member" | "admin";
  emailVerified: boolean;
  createdAt: string;
};

export type Devotion = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  readTime: string;
  date: string;
  verse: string;
  verseText: string;
  image: string;
  imageAlt: string;
  body: string[];
  practice: string;
  published: boolean;
};

export type SavedVerse = {
  reference: string;
  text: string;
  version: string;
  topic: string;
};

export type EventItem = {
  id: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  /** Derived from `date`, e.g. "Aug 8, 2026" */
  displayDate: string;
  time: string;
  location: string;
  description: string;
  speaker: string;
  tag: string;
  /** `/media/<file>` for a bundled asset, `/api/images/<id>` for an upload. */
  image: string;
  published: boolean;
  /** RSVP headcount. */
  rsvpCount: number;
  /** Whether the current signed-in user has RSVP'd. */
  rsvped: boolean;
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
