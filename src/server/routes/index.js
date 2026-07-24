/**
 * Backend route registry.
 *
 * This is the single manifest of every API endpoint and the controller that
 * handles it. It is documentation and a boot-time count — Next.js App Router
 * still owns real dispatch through the matching src/app/api/**\/route.js files,
 * which delegate to these controllers. Keep this map and those files in sync.
 */
import { healthRoutes } from "@/server/routes/health.routes";
import { authRoutes } from "@/server/routes/auth.routes";
import { verseRoutes } from "@/server/routes/verse.routes";
import { prayerRoutes } from "@/server/routes/prayer.routes";
import { streakRoutes } from "@/server/routes/streak.routes";
import { savedRoutes } from "@/server/routes/saved.routes";
import { planRoutes } from "@/server/routes/plan.routes";
import { pushRoutes } from "@/server/routes/push.routes";
import { eventRoutes } from "@/server/routes/event.routes";
import { adminRoutes } from "@/server/routes/admin.routes";

export const routes = {
  ...healthRoutes,
  ...authRoutes,
  ...verseRoutes,
  ...prayerRoutes,
  ...streakRoutes,
  ...savedRoutes,
  ...planRoutes,
  ...pushRoutes,
  ...eventRoutes,
  ...adminRoutes,
};
