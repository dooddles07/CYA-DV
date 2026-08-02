import "server-only";
import { hasAdminSession } from "@/server/utils/admin-session";
import { requireAdmin } from "@/server/services/user.service";
import { getSession } from "@/server/middleware/session";
import { ApiError } from "@/server/utils/api-error";
import { verifyCsrf } from "@/server/middleware/csrf";

/**
 * Single gate for every admin surface.
 *
 * Access is granted by the admin portal passphrase, or by a signed-in user
 * whose account carries the admin role — so promoting an account still works
 * even if the passphrase is rotated. Pass the request so state-changing calls
 * also get the CSRF double-submit check; omit it for read-only calls.
 */
export async function assertAdmin(req) {
  if (await hasAdminSession()) {
    await verifyCsrf(req);
    return "portal";
  }

  const session = await getSession();
  if (!session) throw new ApiError(401, "Admin access required.");
  await requireAdmin(session);
  await verifyCsrf(req);
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
