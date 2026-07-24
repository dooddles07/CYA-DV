// Fail fast with a clear message instead of a cryptic runtime error deep in a request.
const REQUIRED = ["MONGO_URL", "AUTH_SECRET"];

let checked = false;

export function assertEnv() {
  if (checked) return;
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length)
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. See .env.example.`
    );
  checked = true;
}

/** True when every required variable is present — for soft checks like /api/health. */
export function envReady() {
  return REQUIRED.every((k) => Boolean(process.env[k]));
}

export function missingEnv() {
  return REQUIRED.filter((k) => !process.env[k]);
}
