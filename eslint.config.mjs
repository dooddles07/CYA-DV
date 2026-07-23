// eslint-config-next 16 ships native flat config — no FlatCompat needed.
import next from "eslint-config-next";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  ...[next, nextCoreWebVitals, nextTypescript].flat(),
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
];

export default config;
