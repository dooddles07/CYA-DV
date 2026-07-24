import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { dbConnect } from "@/server/config/db";
import { User } from "@/server/models/user.model";

const COOKIE = "cya-session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(s);
}

export async function createSession(user) {
  const token = await new SignJWT({
    name: user.name,
    email: user.email,
    tv: user.tokenVersion ?? 0,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

/**
 * Reads the account's current tokenVersion.
 * @returns {Promise<number | "missing" | "error">} the version, "missing" if
 * the account is gone, or "error" if the DB is unreachable.
 */
async function currentTokenVersion(sub) {
  try {
    await dbConnect();
    const user = await User.findById(sub).select("tokenVersion").lean();
    return user ? user.tokenVersion ?? 0 : "missing";
  } catch {
    return "error";
  }
}

/** Returns { sub, name, email } or null. */
export async function getSession() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;

    // Revocation: the JWT's tokenVersion must still match the account's.
    // It's bumped on password reset, so stale sessions stop working. On a DB
    // outage we fail open (keep the session) rather than log everyone out.
    const fresh = await currentTokenVersion(payload.sub);
    if (fresh === "missing") return null;
    if (fresh !== "error" && fresh !== Number(payload.tv ?? 0)) return null;

    return {
      sub: payload.sub,
      name: typeof payload.name === "string" ? payload.name : "",
      email: typeof payload.email === "string" ? payload.email : "",
    };
  } catch {
    return null;
  }
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}
