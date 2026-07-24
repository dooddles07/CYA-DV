// Static content layer. Verse texts use the World English Bible (WEB),
// a public-domain translation, with "Yahweh" rendered as "the LORD".
// verseLibrary doubles as the DB seed — see src/lib/verse-of-day.ts.

export type Verse = {
  reference: string;
  text: string;
  version: string;
  topic: string;
};

export const todaysVerse: Verse = {
  reference: "Isaiah 40:31",
  text: "But those who wait for the LORD will renew their strength. They will mount up with wings like eagles. They will run, and not be weary. They will walk, and not faint.",
  version: "WEB",
  topic: "Strength",
};

export const verseLibrary: Verse[] = [
  todaysVerse,
  { reference: "Jeremiah 29:11", text: "“For I know the thoughts that I think toward you,” says the LORD, “thoughts of peace, and not of evil, to give you hope and a future.”", version: "WEB", topic: "Hope" },
  { reference: "Philippians 4:6-7", text: "In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God. And the peace of God, which surpasses all understanding, will guard your hearts and your thoughts in Christ Jesus.", version: "WEB", topic: "Peace" },
  { reference: "Joshua 1:9", text: "Haven't I commanded you? Be strong and courageous. Don't be afraid. Don't be dismayed, for the LORD your God is with you wherever you go.", version: "WEB", topic: "Courage" },
  { reference: "Psalm 23:1-3", text: "The LORD is my shepherd: I shall lack nothing. He makes me lie down in green pastures. He leads me beside still waters. He restores my soul.", version: "WEB", topic: "Peace" },
  { reference: "1 Corinthians 16:14", text: "Let all that you do be done in love.", version: "WEB", topic: "Love" },
  { reference: "Proverbs 3:5-6", text: "Trust in the LORD with all your heart, and don't lean on your own understanding. In all your ways acknowledge him, and he will make your paths straight.", version: "WEB", topic: "Wisdom" },
  { reference: "Matthew 11:28", text: "“Come to me, all you who labor and are heavily burdened, and I will give you rest.”", version: "WEB", topic: "Rest" },
  { reference: "Romans 8:28", text: "We know that all things work together for good for those who love God, to those who are called according to his purpose.", version: "WEB", topic: "Faith" },
  { reference: "Psalm 46:1", text: "God is our refuge and strength, a very present help in trouble.", version: "WEB", topic: "Strength" },
  { reference: "1 Timothy 4:12", text: "Let no man despise your youth; but be an example to those who believe, in word, in your way of life, in love, in spirit, in faith, and in purity.", version: "WEB", topic: "Youth" },
  { reference: "Lamentations 3:22-23", text: "It is because of the LORD's loving kindnesses that we are not consumed, because his compassion doesn't fail. They are new every morning. Great is your faithfulness.", version: "WEB", topic: "Grace" },
];

export const categories = [
  { name: "Faith", icon: "Sparkles", count: 128 },
  { name: "Hope", icon: "Sunrise", count: 96 },
  { name: "Love", icon: "Heart", count: 143 },
  { name: "Wisdom", icon: "Lightbulb", count: 87 },
  { name: "Peace", icon: "Leaf", count: 74 },
  { name: "Strength", icon: "Mountain", count: 89 },
  { name: "Forgiveness", icon: "HandHeart", count: 52 },
  { name: "Prayer", icon: "Church", count: 110 },
  { name: "Grace", icon: "Droplets", count: 65 },
  { name: "Joy", icon: "Smile", count: 71 },
  { name: "Healing", icon: "HeartPulse", count: 48 },
  { name: "Family", icon: "House", count: 59 },
  { name: "Youth", icon: "Flame", count: 83 },
  { name: "Leadership", icon: "Compass", count: 44 },
  { name: "Encouragement", icon: "MessageCircleHeart", count: 102 },
] as const;

export const moods = [
  { feeling: "I feel anxious", verse: verseLibrary[2], tint: "#e8f5ff" },
  { feeling: "I need hope", verse: verseLibrary[1], tint: "#fff6e8" },
  { feeling: "I feel lonely", verse: verseLibrary[7], tint: "#f3efff" },
  { feeling: "I need strength", verse: verseLibrary[0], tint: "#e8fff3" },
  { feeling: "I need forgiveness", verse: verseLibrary[11], tint: "#fff0f0" },
  { feeling: "I need peace", verse: verseLibrary[4], tint: "#eafaff" },
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

export const readingPlan = {
  name: "Through the Gospels in 90 Days",
  todayReading: "John 15:1–17",
  todayTheme: "The Vine and the Branches",
  day: 42,
  totalDays: 90,
  weekProgress: [true, true, true, true, false, false, false],
  upcoming: [
    { day: 43, passage: "John 15:18–27", theme: "The World's Hatred" },
    { day: 44, passage: "John 16:1–15", theme: "The Work of the Spirit" },
    { day: 45, passage: "John 16:16–33", theme: "Grief Will Turn to Joy" },
  ],
};

export const otherPlans = [
  { name: "Psalms of Peace", days: 30, tag: "Calm", desc: "One psalm a day for anxious seasons." },
  { name: "Proverbs for Students", days: 31, tag: "Wisdom", desc: "Practical wisdom for school, friends, and choices." },
  { name: "First Steps: New Believer", days: 21, tag: "Foundations", desc: "The essentials of following Jesus, from day one." },
  { name: "Acts: The Church on Fire", days: 28, tag: "Mission", desc: "Watch the early church turn the world upside down." },
];

export const prayerWall = [
  { name: "Kim", request: "Please pray for my upcoming board exams. I'm nervous but trusting God's plan.", prayedCount: 47, time: "2h ago", tag: "Studies" },
  { name: "MJ", request: "Praying for my father's healing and full recovery from surgery.", prayedCount: 132, time: "5h ago", tag: "Healing" },
  { name: "Ralph", request: "For our youth camp this August — that many young people will encounter Christ.", prayedCount: 89, time: "8h ago", tag: "Ministry" },
  { name: "Julie", request: "Struggling with anxiety lately. Pray that I find peace in God's presence.", prayedCount: 64, time: "12h ago", tag: "Peace" },
];

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

export const events = [
  {
    title: "Step In, Shine Out: Youth Encounter",
    date: "2026-08-08",
    displayDate: "Aug 8, 2026",
    time: "1:00 PM",
    location: "CYA Main Hall, Quezon City",
    speaker: "Ralph",
    image: "/media/greatest-love.jpg",
    tag: "Youth Camp",
  },
  {
    title: "KKBBH Worship & Fellowship Night",
    date: "2026-07-25",
    displayDate: "Jul 25, 2026",
    time: "6:00 PM",
    location: "Fellowship Center, Room 204",
    speaker: "Gwen & the CYA Worship Team",
    image: "/media/stage-event.jpg",
    tag: "Fellowship",
  },
  {
    title: "Servant Leaders Training Day",
    date: "2026-08-22",
    displayDate: "Aug 22, 2026",
    time: "9:00 AM",
    location: "CYA Training Room",
    speaker: "Julie",
    image: "/media/leader-teaching.jpg",
    tag: "Leadership",
  },
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
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
