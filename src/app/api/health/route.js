import { NextResponse } from "next/server";
import { missingEnv } from "@/server/config/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const missing = missingEnv();
  if (missing.length)
    return NextResponse.json({ ok: false, missingEnv: missing }, { status: 503 });
  return NextResponse.json({ ok: true });
}
