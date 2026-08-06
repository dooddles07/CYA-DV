import "server-only";

/** Parses a request body as JSON, tolerating an empty/malformed body. */
export async function readJson(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}
