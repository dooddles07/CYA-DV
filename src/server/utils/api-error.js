import { NextResponse } from "next/server";

/** Throw from services with a user-safe message; controllers map it to JSON. */
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function toResponse(err, fallback = "Something went wrong. Please try again.") {
  if (err instanceof ApiError)
    return NextResponse.json({ error: err.message }, { status: err.status });
  return NextResponse.json({ error: fallback }, { status: 500 });
}
