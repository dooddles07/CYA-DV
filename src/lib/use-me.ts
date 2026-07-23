"use client";

import { useEffect, useState } from "react";

export type Me = {
  name: string;
  email: string;
  xp: number;
  level: number;
  xpToNext: number;
  streak: number;
  bestStreak: number;
  lastReadDate: string | null;
};

/** Current signed-in user, or null. `undefined` while loading. */
export function useMe(): Me | null | undefined {
  const [me, setMe] = useState<Me | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => alive && setMe(d.user ?? null))
      .catch(() => alive && setMe(null));
    return () => {
      alive = false;
    };
  }, []);

  return me;
}
