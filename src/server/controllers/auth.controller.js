import "server-only";
import { NextResponse } from "next/server";
import { loginUser, registerUser } from "@/server/services/auth.service";
import { getUserStats } from "@/server/services/user.service";
import { createSession, destroySession, getSession } from "@/server/utils/session";
import { toResponse } from "@/server/utils/api-error";

async function readJson(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

export async function register(req) {
  try {
    const user = await registerUser(await readJson(req));
    await createSession(user);
    return NextResponse.json({ user: { name: user.name, email: user.email } }, { status: 201 });
  } catch (err) {
    return toResponse(err);
  }
}

export async function login(req) {
  try {
    const user = await loginUser(await readJson(req));
    await createSession(user);
    return NextResponse.json({ user: { name: user.name, email: user.email } });
  } catch (err) {
    return toResponse(err);
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
