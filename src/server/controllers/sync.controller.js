import "server-only";
import { NextResponse } from "next/server";
import { syncVerses } from "@/server/services/verse.service";
import { requireAdmin } from "@/server/services/user.service";
import { getSession } from "@/server/utils/session";
import { ApiError, toResponse } from "@/server/utils/api-error";

/**
 * Loads src/data/verses.json into the database.
 *
 * Exists because the auto-seed only fires on an empty collection, so a
 * deployment that already has verses would otherwise never receive additions.
 * Authorized by either the cron secret or an admin session.
 */
export async function syncVerseCorpus(req) {
  try {
    const secret = process.env.CRON_SECRET;
    const provided =
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
      new URL(req.url).searchParams.get("secret");

    if (!secret || provided !== secret) {
      const session = await getSession();
      if (!session) throw new ApiError(401, "Not authorized.");
      await requireAdmin(session);
    }

    return NextResponse.json(await syncVerses());
  } catch (err) {
    return toResponse(err, "Could not sync verses.");
  }
}
