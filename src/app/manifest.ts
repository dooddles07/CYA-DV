import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CYA Daily Verse",
    short_name: "CYA Verse",
    description:
      "Daily verses, gentle devotionals, reading plans, and a praying community — built by Christ's Youth in Action.",
    start_url: "/verse",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0095ff",
    categories: ["lifestyle", "education", "books"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Today's verse", url: "/verse" },
      { name: "Prayer wall", url: "/prayer" },
      { name: "My dashboard", url: "/dashboard" },
    ],
  };
}
