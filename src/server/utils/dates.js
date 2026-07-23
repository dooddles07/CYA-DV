/** Today's date key in Asia/Manila, YYYY-MM-DD. Day rolls over at PH midnight. */
export function manilaDayKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(date);
}

/** Whole days since epoch for a YYYY-MM-DD key. */
export function dayNumber(key) {
  return Math.floor(Date.parse(`${key}T00:00:00Z`) / 86_400_000);
}
