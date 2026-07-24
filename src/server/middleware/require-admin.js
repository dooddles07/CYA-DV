import "server-only";
import { hasAdminSession } from "@/server/utils/admin-session";
import { requireAdmin } from "@/server/services/user.service";
import { getSession } from "@/server/middleware/session";
import { ApiError } from "@/server/utils/api-error";

/**
 * Single gate for every admin surface.
 *
 * Access is granted by the admin portal passphrase, or by a signed-in user
 * whose account carries the admin role — so promoting an account still works
 * even if the passphrase is rotated.
 */
export async function assertAdmin() {
  if (await hasAdminSession()) return "portal";

  const session = await getSession();
  if (!session) throw new ApiError(401, "Admin access required.");
  await requireAdmin(session);
  return "account";
}

/** Non-throwing variant for pages that redirect rather than error. */
export async function isAdmin() {
  try {
    await assertAdmin();
    return true;
  } catch {
    return false;
  }
}
