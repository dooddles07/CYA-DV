"use client";

/**
 * Animated aurora mesh + drifting motes.
 * Pure CSS so it costs nothing on the main thread, and the whole layer is
 * removed by the reduced-motion rule in globals.css.
 */
export function Aurora({ dense = false }: { dense?: boolean }) {
  const motes = dense
    ? [
        { l: "8%", t: "22%", s: 8, d: "0s" },
        { l: "16%", t: "68%", s: 5, d: "1.2s" },
        { l: "30%", t: "12%", s: 6, d: "2.1s" },
        { l: "58%", t: "8%", s: 5, d: "0.6s" },
        { l: "76%", t: "18%", s: 9, d: "1.7s" },
        { l: "88%", t: "48%", s: 6, d: "0.3s" },
        { l: "70%", t: "78%", s: 7, d: "2.5s" },
        { l: "42%", t: "86%", s: 5, d: "1.0s" },
      ]
    : [
        { l: "12%", t: "28%", s: 6, d: "0s" },
        { l: "82%", t: "20%", s: 7, d: "1.4s" },
        { l: "66%", t: "74%", s: 5, d: "2.2s" },
      ];

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="aurora-layer motion-safe:animate-aurora"
        style={{
          background:
            "radial-gradient(38% 44% at 18% 22%, rgba(0,149,255,0.30), transparent 62%), radial-gradient(34% 40% at 82% 26%, rgba(102,212,255,0.26), transparent 60%), radial-gradient(46% 42% at 50% 92%, rgba(0,149,255,0.16), transparent 66%)",
        }}
      />
      {motes.map((m, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-primary/25 motion-safe:animate-float"
          style={{ left: m.l, top: m.t, width: m.s, height: m.s, animationDelay: m.d }}
        />
      ))}
    </div>
  );
}
