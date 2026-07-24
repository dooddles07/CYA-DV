import type { MetadataRoute } from "next";
import { devotions } from "@/lib/data";
import { SITE_URL } from "@/lib/site";

const routes = ["", "/verse", "/search", "/plans", "/devotion", "/prayer", "/events", "/mood", "/about", "/login", "/register"];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    ...routes.map((path) => ({
      url: `${SITE_URL}${path}`,
      lastModified: now,
      changeFrequency: path === "" || path === "/verse" ? ("daily" as const) : ("weekly" as const),
      priority: path === "" ? 1 : 0.7,
    })),
    ...devotions.map((d) => ({
      url: `${SITE_URL}/devotion/${d.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
