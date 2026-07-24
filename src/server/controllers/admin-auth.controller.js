import "server-only";
import { NextResponse } from "next/server";
import {
  createAdminSession,
  destroyAdminSession,
  passphraseMatches,
  portalConfigured,
} from "@/server/utils/admin-session";
import { ApiError, toResponse } from "@/server/utils/api-error";
import { rateLimit } from "@/server/utils/rate-limit";

export async function portalLogin(req) {
  try {
    // A single shared secret is the only thing standing here, so brute force
    // protection is tighter than anywhere else in the app.
    await rateLimit(req, {
      name: "admin:portal",
      limit: 5,
      windowMs: 15 * 60_000,
      message: "Too many attempts. Wait 15 minutes before trying again.",
    });

    if (!portalConfigured())
      throw new ApiError(503, "The admin portal is not configured on this server.");

    const body = await req.json().catch(() => ({}));
    if (!passphraseMatches(body.passphrase))
      throw new ApiError(401, "That passphrase is not correct.");

    await createAdminSession();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toResponse(err, "Could not sign in.");
  }
}

export async function portalLogout() {
  await destroyAdminSession();
  return NextResponse.json({ ok: true });
}
