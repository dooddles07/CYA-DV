import "server-only";
import { dbConnect } from "@/server/config/db";
import { AdminAuditLog } from "@/server/models/admin-audit-log.model";
import { hasAdminSession } from "@/server/utils/admin-session";
import { getSession } from "@/server/middleware/session";
import { logError } from "@/server/utils/logger";

/**
 * Best-effort append-only trail for privileged mutations. Never throws —
 * a logging failure must not fail the admin action it's recording. Resolves
 * the actor from whichever admin path is active (portal passphrase or an
 * admin-role account); pass actorLabel to override for non-cookie callers
 * (e.g. the cron-secret path).
 */
export async function logAdminAction({ action, targetType, targetId, meta, actorLabel }) {
  try {
    await dbConnect();
    let label = actorLabel;
    let actorId = null;
    if (!label) {
      if (await hasAdminSession()) {
        label = "admin-portal";
      } else {
        const session = await getSession();
        actorId = session?.sub ?? null;
        label = session?.email || "unknown";
      }
    }
    await AdminAuditLog.create({
      actorId,
      actorLabel: label,
      action,
      targetType,
      targetId: targetId != null ? String(targetId) : undefined,
      meta,
    });
  } catch (err) {
    logError("admin-audit.log", err);
  }
}
