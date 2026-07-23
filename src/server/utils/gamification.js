export const XP_PER_READ = 25;
export const XP_PER_LEVEL = 250;

export function levelFor(xp) {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

/** Total XP required to reach the next level. */
export function xpToNext(xp) {
  return levelFor(xp) * XP_PER_LEVEL;
}
