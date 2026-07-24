import { NextResponse } from "next/server";
import { status } from "@/server/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await status();
  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}
