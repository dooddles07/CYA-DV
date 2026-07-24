import "server-only";
import { NextResponse } from "next/server";
import { deleteAccount, exportUserData } from "@/server/services/account.service";
import { getSession, destroySession } from "@/server/middleware/session";
import { toResponse } from "@/server/utils/api-error";

export async function exportData() {
  try {
    const session = await getSession({ strict: true });
    if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const data = await exportUserData(session.sub);
    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="cya-daily-verse-data.json"',
      },
    });
  } catch (err) {
    return toResponse(err, "Could not export your data.");
  }
}

export async function remove() {
  try {
    const session = await getSession({ strict: true });
    if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    await deleteAccount(session.sub);
    await destroySession();
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return toResponse(err, "Could not delete your account.");
  }
}
