// Static content layer. Verse texts use the World English Bible (WEB),
// a public-domain translation, with "Yahweh" rendered as "the LORD".
// The verse corpus lives in src/data/verses.json — regenerate it with
// `npm run verses:fetch`, load it into the database with `npm run seed`.

import verses from "../data/verses.json" with { type: "json" };

export type Verse = {
  reference: string;
  text: string;
  version: string;
  topic: string;
};

export const verseLibrary: Verse[] = verses;

/** Fallback only — the live verse of the day comes from the database. */
export const todaysVerse: Verse =
  verseLibrary.find((v) => v.reference === "Isaiah 40:31") ?? verseLibrary[0];

/** Topic names must match the `topic` values in verses.json, or a grid tile shows no verses. */
export const categories = [
  { name: "Faith", icon: "Sparkles" },
  { name: "Hope", icon: "Sunrise" },
  { name: "Love", icon: "Heart" },
  { name: "Wisdom", icon: "Lightbulb" },
  { name: "Peace", icon: "Leaf" },
  { name: "Strength", icon: "Mountain" },
  { name: "Forgiveness", icon: "HandHeart" },
  { name: "Prayer", icon: "Church" },
  { name: "Grace", icon: "Droplets" },
  { name: "Joy", icon: "Smile" },
  { name: "Healing", icon: "HeartPulse" },
  { name: "Family", icon: "House" },
  { name: "Youth", icon: "Flame" },
  { name: "Leadership", icon: "Compass" },
  { name: "Encouragement", icon: "MessageCircleHeart" },
] as const;

function byReference(reference: string): Verse {
  return verseLibrary.find((v) => v.reference === reference) ?? verseLibrary[0];
}

export const moods = [
  { feeling: "I feel anxious", verse: byReference("Philippians 4:6-7"), tint: "#e8f5ff" },
  { feeling: "I need hope", verse: byReference("Jeremiah 29:11"), tint: "#fff6e8" },
  { feeling: "I feel lonely", verse: byReference("Deuteronomy 31:8"), tint: "#f3efff" },
  { feeling: "I need strength", verse: byReference("Isaiah 40:31"), tint: "#e8fff3" },
  { feeling: "I need forgiveness", verse: byReference("1 John 1:9"), tint: "#fff0f0" },
  { feeling: "I need peace", verse: byReference("John 14:27"), tint: "#eafaff" },
];

export type Devotion = {
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
};

export const devotions: Devotion[] = [
  {
    slug: "wings-like-eagles",
    title: "Wings Like Eagles: Strength for the Waiting Season",
    excerpt: "Waiting is not wasted time. Isaiah reminds us that hope in the Lord is an exchange — our exhaustion for His strength.",
    author: "Ralph",
    readTime: "4 min",
    date: "July 17, 2026",
    verse: "Isaiah 40:31",
    verseText: "But those who wait for the LORD will renew their strength. They will mount up with wings like eagles.",
    image: "/media/tree-guitar.jpg",
    imageAlt: "CYA members resting together under a tree with a guitar",
    body: [
      "There is a specific kind of tiredness that sleep doesn't fix. You know it — the exam week that blurs into the next, the family situation you can't solve, the serving schedule that quietly emptied your tank. Isaiah 40 was written to people that tired.",
      "And notice what God doesn't say. He doesn't say try harder. He says wait on Me, and I will renew you. The eagle doesn't flap harder to soar — it finds the wind and spreads its wings.",
      "Waiting on God is not passive. It is choosing, every morning, to put your expectation in the only One whose strength never runs out. That's what this app is for. That's what this morning is for.",
    ],
    practice: "Before you open any other app, sit for one minute of silence and pray five words: “Lord, I am waiting on You.”",
  },
  {
    slug: "new-every-morning",
    title: "New Every Morning",
    excerpt: "God's mercies don't run out at midnight. Every sunrise is a fresh page of grace written just for you.",
    author: "Julie",
    readTime: "3 min",
    date: "July 16, 2026",
    verse: "Lamentations 3:22-23",
    verseText: "They are new every morning. Great is your faithfulness.",
    image: "/media/golden-selfie.jpg",
    imageAlt: "A CYA member smiling in golden morning light",
    body: [
      "Lamentations is a book of grief. Jeremiah is watching his city burn, and in the middle of that ruin he writes one of the most hopeful lines in Scripture: his compassions never fail, they are new every morning.",
      "Not recycled. New. Whatever you spent yesterday — the patience you ran out of, the grace you failed to give, the prayer you never finished — none of it drains tomorrow's supply.",
      "That means today does not inherit yesterday's verdict. You are not behind with God. You are simply at the start of a morning that already has mercy waiting in it.",
    ],
    practice: "Name one thing from yesterday you're still carrying. Say it out loud to God, then leave it in yesterday where His mercy already covered it.",
  },
  {
    slug: "young-and-called",
    title: "Young and Called",
    excerpt: "Timothy was told to never let his youth disqualify him. Neither should you — your generation is your mission field.",
    author: "MJ",
    readTime: "5 min",
    date: "July 15, 2026",
    verse: "1 Timothy 4:12",
    verseText: "Let no man despise your youth; but be an example to those who believe.",
    image: "/media/cya-shirts.jpg",
    imageAlt: "CYA members in matching shirts at a youth gathering",
    body: [
      "Timothy was leading a church while people twice his age questioned whether he should be. Paul's answer was not wait your turn. It was: don't let anyone look down on you — and then he raised the standard instead of lowering it.",
      "Notice the five areas Paul lists: speech, conduct, love, faith, purity. None of them require a title, a platform, or a stage. Every one of them is available to you today, in your group chat, your classroom, your home.",
      "Your generation is not the church of tomorrow waiting to be activated. You are the church of this morning. The question was never whether you're old enough. It's whether you'll be an example where you already are.",
    ],
    practice: "Pick one of the five — speech, conduct, love, faith, purity — and choose a single concrete way to lead in it before the day ends.",
  },
];

/** Expands a book into one chapter per day, e.g. chapters("Acts", 28). */
function chapters(book: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => `${book} ${i + 1}`);
}

export type ReadingPlan = {
  slug: string;
  name: string;
  tag: string;
  desc: string;
  readings: string[];
};

/**
 * Plans are real chapter schedules — day N is simply readings[N-1], so the
 * progress a user sees always matches the passage they were asked to read.
 */
export const readingPlans: ReadingPlan[] = [
  {
    slug: "through-the-gospels",
    name: "Through the Gospels",
    tag: "Core",
    desc: "One chapter a day through Matthew, Mark, Luke, and John.",
    readings: [
      ...chapters("Matthew", 28),
      ...chapters("Mark", 16),
      ...chapters("Luke", 24),
      ...chapters("John", 21),
    ],
  },
  {
    slug: "psalms-of-peace",
    name: "Psalms of Peace",
    tag: "Calm",
    desc: "One psalm a day for anxious seasons.",
    readings: [
      1, 3, 4, 8, 16, 18, 20, 23, 27, 30, 34, 37, 40, 42, 46, 51, 55, 62, 63, 71, 84, 86, 91, 100,
      103, 116, 121, 130, 139, 145,
    ].map((n) => `Psalm ${n}`),
  },
  {
    slug: "proverbs-for-students",
    name: "Proverbs for Students",
    tag: "Wisdom",
    desc: "Practical wisdom for school, friends, and choices — one chapter a day.",
    readings: chapters("Proverbs", 31),
  },
  {
    slug: "acts-church-on-fire",
    name: "Acts: The Church on Fire",
    tag: "Mission",
    desc: "Watch the early church turn the world upside down.",
    readings: chapters("Acts", 28),
  },
  {
    slug: "first-steps",
    name: "First Steps: New Believer",
    tag: "Foundations",
    desc: "The essentials of following Jesus, from day one.",
    readings: [
      "John 1", "John 3", "John 14", "Romans 3", "Romans 5", "Romans 6", "Romans 8",
      "Ephesians 1", "Ephesians 2", "Ephesians 4", "Philippians 2", "Colossians 3",
      "1 John 1", "1 John 3", "1 John 4", "James 1", "Matthew 5", "Matthew 6",
      "Matthew 7", "Acts 2", "Psalm 1",
    ],
  },
];

export const defaultPlanSlug = "through-the-gospels";

export function getPlan(slug: string): ReadingPlan | undefined {
  return readingPlans.find((p) => p.slug === slug);
}

export const challenges = [
  { type: "Memorize", title: "Hide Isaiah 40:31 in your heart", xp: 50, icon: "Brain" },
  { type: "Kindness", title: "Encourage one friend with a verse today", xp: 30, icon: "HandHeart" },
  { type: "Prayer", title: "Pray for 3 people on the prayer wall", xp: 40, icon: "Church" },
  { type: "Reflection", title: "Journal: where did you see God this week?", xp: 35, icon: "PenLine" },
];

export const quotes = [
  { text: "God's Word is a lamp that never runs out of oil.", author: "Gwen" },
  { text: "You are never too young to be used by God, and never too old to be renewed by Him.", author: "Ralph" },
  { text: "Prayer is not a backup plan. It is the battle plan.", author: "CYA Youth Camp 2025" },
  { text: "Kay Kristo Buong Buhay, Habambuhay!", author: "CYA — Christ's Youth in Action" },
];

export const testimonials = [
  {
    name: "Kim",
    role: "Student, 19",
    quote: "I used to scroll social media first thing every morning. Now CYA Daily Verse is my first tap — my mornings finally feel peaceful.",
    image: "/media/golden-selfie.jpg",
  },
  {
    name: "Ralph",
    role: "Youth Leader",
    quote: "The reading streak turned our whole small group into daily Bible readers. We compare streaks like it's a game — but the Word is real.",
    image: "/media/cya-shirts.jpg",
  },
  {
    name: "MJ",
    role: "Ministry Volunteer",
    quote: "The prayer wall carried me through my hardest season. Dozens of young people I've never met prayed for my family.",
    image: "/media/worship-practice.jpg",
  },
];

export const streak = { current: 12, best: 30, xp: 1840, level: 7 };

export const reflectionQuestions = [
  "What does this verse show you about who God is?",
  "Where does this word meet your life right now — school, family, work, or a quiet worry?",
  "Who could you encourage with this verse today, and how?",
];

export function getTodayLabel(): string {
  return new Date().toLocaleDateString("en-US", {
    timeZone: "Asia/Manila",
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
