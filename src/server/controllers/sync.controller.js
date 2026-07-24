import "server-only";
import { NextResponse } from "next/server";
import { syncVerses } from "@/server/services/verse.service";
import { assertAdmin } from "@/server/utils/require-admin";
import { toResponse } from "@/server/utils/api-error";

/**
 * Loads src/data/verses.json into the database.
 *
 * Exists because the auto-seed only fires on an empty collection, so a
 * deployment that already has verses would otherwise never receive additions.
 * Authorized by either the cron secret or an admin session.
 */
export async function syncVerseCorpus(req) {
  try {
    // Header only — a query param would leak the secret into access logs.
    const secret = process.env.CRON_SECRET;
    const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    if (!secret || provided !== secret) await assertAdmin();

    return NextResponse.json(await syncVerses());
  } catch (err) {
    return toResponse(err, "Could not sync verses.");
  }
}
