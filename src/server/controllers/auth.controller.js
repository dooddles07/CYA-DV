import "server-only";
import { NextResponse } from "next/server";
import { loginUser, registerUser } from "@/server/services/auth.service";
import { completeReset, requestReset } from "@/server/services/password-reset.service";
import { getUserStats } from "@/server/services/user.service";
import { createSession, destroySession, getSession } from "@/server/utils/session";
import { toResponse } from "@/server/utils/api-error";
import { rateLimit } from "@/server/utils/rate-limit";

async function readJson(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

export async function register(req) {
  try {
    await rateLimit(req, { name: "auth:register", limit: 5, windowMs: 60 * 60_000 });
    const user = await registerUser(await readJson(req));
    await createSession(user);
    return NextResponse.json({ user: { name: user.name, email: user.email } }, { status: 201 });
  } catch (err) {
    return toResponse(err);
  }
}

export async function login(req) {
  try {
    // Throttles password guessing without locking out a legitimate user for long.
    await rateLimit(req, {
      name: "auth:login",
      limit: 10,
      windowMs: 15 * 60_000,
      message: "Too many sign-in attempts — please wait a few minutes and try again.",
    });
    const user = await loginUser(await readJson(req));
    await createSession(user);
    return NextResponse.json({ user: { name: user.name, email: user.email } });
  } catch (err) {
    return toResponse(err);
  }
}

export async function forgotPassword(req) {
  try {
    // Tight limit: this endpoint sends mail on someone else's behalf.
    await rateLimit(req, {
      name: "auth:forgot",
      limit: 3,
      windowMs: 15 * 60_000,
      message: "Too many reset requests — please wait a few minutes.",
    });
    const body = await readJson(req);
    return NextResponse.json(await requestReset(body.email));
  } catch (err) {
    return toResponse(err, "Could not send the reset email.");
  }
}

export async function resetPassword(req) {
  try {
    await rateLimit(req, { name: "auth:reset", limit: 10, windowMs: 15 * 60_000 });
    const body = await readJson(req);
    const user = await completeReset(body.token, body.password);
    // Sign them straight in — the token proved control of the mailbox.
    await createSession(user);
    return NextResponse.json({ user: { name: user.name, email: user.email } });
  } catch (err) {
    return toResponse(err, "Could not reset your password.");
  }
}

export async function logout() {
  await destroySession();
  return NextResponse.json({ ok: true });
}

export async function me() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null });
  return NextResponse.json({ user: await getUserStats(session) });
}
