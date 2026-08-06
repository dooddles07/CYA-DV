import "server-only";
import { NextResponse } from "next/server";
import {
  beginEnrollment,
  confirmEnrollment,
  verifyMemberCode,
  verifyPortalCode,
} from "@/server/services/mfa.service";
import { createSession } from "@/server/middleware/session";
import { createAdminSession } from "@/server/utils/admin-session";
import { destroyMfaPending, getMfaPending } from "@/server/middleware/mfa-pending";
import { logAdminAction } from "@/server/utils/admin-audit";
import { rateLimit } from "@/server/middleware/rate-limit";
import { verifyCsrf } from "@/server/middleware/csrf";
import { ApiError, toResponse } from "@/server/utils/api-error";

async function readJson(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

export async function enroll(req) {
  try {
    await verifyCsrf(req);
    await rateLimit(req, { name: "auth:mfa-enroll", limit: 5, windowMs: 15 * 60_000 });
    const pending = await getMfaPending();
    if (!pending || pending.kind !== "member" || pending.purpose !== "enroll")
      throw new ApiError(401, "Sign in again to set up two-factor authentication.");
    return NextResponse.json(await beginEnrollment(pending.sub));
  } catch (err) {
    return toResponse(err, "Could not start MFA setup.");
  }
}

export async function enrollConfirm(req) {
  try {
    await verifyCsrf(req);
    await rateLimit(req, { name: "auth:mfa-enroll-confirm", limit: 5, windowMs: 15 * 60_000 });
    const pending = await getMfaPending();
    if (!pending || pending.kind !== "member" || pending.purpose !== "enroll")
      throw new ApiError(401, "Sign in again to set up two-factor authentication.");
    const body = await readJson(req);
    const user = await confirmEnrollment(pending.sub, body.code);
    await destroyMfaPending();
    await createSession(user);
    return NextResponse.json({ user: { name: user.name, email: user.email } });
  } catch (err) {
    return toResponse(err, "Could not confirm that code.");
  }
}

export async function verify(req) {
  try {
    await verifyCsrf(req);
    await rateLimit(req, { name: "auth:mfa-verify", limit: 8, windowMs: 15 * 60_000 });
    const pending = await getMfaPending();
    if (!pending || pending.purpose !== "verify") throw new ApiError(401, "Sign in again.");
    const body = await readJson(req);

    if (pending.kind === "portal") {
      if (body.backupCode) throw new ApiError(400, "Backup codes aren't available for the portal login.");
      await verifyPortalCode({ code: body.code });
      await destroyMfaPending();
      await createAdminSession();
      await logAdminAction({
        action: "admin.portal-login",
        targetType: "admin-session",
        actorLabel: "admin-portal",
      });
      return NextResponse.json({ ok: true });
    }

    const user = await verifyMemberCode(pending.sub, { code: body.code, backupCode: body.backupCode });
    await destroyMfaPending();
    await createSession(user);
    return NextResponse.json({ user: { name: user.name, email: user.email } });
  } catch (err) {
    return toResponse(err, "Could not verify that code.");
  }
}
