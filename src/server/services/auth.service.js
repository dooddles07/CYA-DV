import "server-only";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/server/config/db";
import { User } from "@/server/models/user.model";
import { ApiError } from "@/server/utils/api-error";
import { isPasswordBreached } from "@/server/services/breach-check.service";

export async function registerUser({ name, email, password }) {
  name = String(name ?? "").trim();
  email = String(email ?? "").trim().toLowerCase();
  password = String(password ?? "");

  if (!name) throw new ApiError(400, "Please tell us your name.");
  if (name.length < 2) throw new ApiError(400, "Your name needs at least 2 characters.");
  if (name.length > 60) throw new ApiError(400, "Please use a shorter name (60 characters max).");
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 120)
    throw new ApiError(400, "That email doesn't look right.");
  if (password.length < 8) throw new ApiError(400, "Password needs at least 8 characters.");
  if (await isPasswordBreached(password))
    throw new ApiError(400, "This password has appeared in a data breach. Please choose a different one.");

  await dbConnect();
  if (await User.findOne({ email }).lean())
    throw new ApiError(409, "An account with this email already exists.");

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash });
  return { id: user._id.toString(), name: user.name, email: user.email, tokenVersion: user.tokenVersion ?? 0 };
}

export async function loginUser({ email, password }) {
  email = String(email ?? "").trim().toLowerCase();
  password = String(password ?? "");
  if (!email || !password) throw new ApiError(400, "Email and password are required.");

  await dbConnect();
  const user = await User.findOne({ email });
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) throw new ApiError(401, "Invalid email or password.");

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    tokenVersion: user.tokenVersion ?? 0,
    role: user.role,
    totpEnabled: Boolean(user.totpEnabled),
  };
}
