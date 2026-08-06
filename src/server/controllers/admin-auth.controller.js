import "server-only";
import { NextResponse } from "next/server";
import {
  createAdminSession,
  destroyAdminSession,
  passphraseMatches,
  portalConfigured,
  portalMfaConfigured,
} from "@/server/utils/admin-session";
import { ApiError, toResponse } from "@/server/utils/api-error";
import { rateLimit } from "@/server/middleware/rate-limit";
import { logAdminAction } from "@/server/utils/admin-audit";
import { createMfaPending } from "@/server/middleware/mfa-pending";

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

    if (portalMfaConfigured()) {
      await createMfaPending({ sub: "admin-portal", kind: "portal", purpose: "verify" });
      return NextResponse.json({ mfaRequired: true });
    }

    await createAdminSession();
    await logAdminAction({
      action: "admin.portal-login",
      targetType: "admin-session",
      actorLabel: "admin-portal",
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toResponse(err, "Could not sign in.");
  }
}

export async function portalLogout() {
  await destroyAdminSession();
  await logAdminAction({
    action: "admin.portal-logout",
    targetType: "admin-session",
    actorLabel: "admin-portal",
  });
  return NextResponse.json({ ok: true });
}
