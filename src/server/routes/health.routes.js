import { NextResponse } from "next/server";
import { status } from "@/server/server";

// Route layer: binds URLs to controllers. The matching src/app/api file is a
// thin shim that re-exports these, so this stays the single source of truth.

/** GET /api/health - readiness plus env/DB status. */
export const health = async () => {
  const result = await status();
  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
};
