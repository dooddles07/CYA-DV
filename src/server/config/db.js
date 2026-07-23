import mongoose from "mongoose";

// Cache the connection across hot reloads / route invocations.
const cached = global._mongoose ?? (global._mongoose = { conn: null, promise: null });

export async function dbConnect() {
  const url = process.env.MONGO_URL;
  if (!url) throw new Error("MONGO_URL is not set");
  if (cached.conn) return cached.conn;
  cached.promise ??= mongoose.connect(url, {
    bufferCommands: false,
    serverSelectionTimeoutMS: 5000,
  });
  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }
  return cached.conn;
}
