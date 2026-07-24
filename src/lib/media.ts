/**
 * Images bundled in /public/media, offered as choices in the admin event form.
 * Keeping this a fixed list means an event image can only ever point at an
 * asset we ship — no external URLs, no broken links.
 */
export const mediaLibrary = [
  { path: "/media/stage-event.jpg", label: "Stage event" },
  { path: "/media/greatest-love.jpg", label: "Greatest love" },
  { path: "/media/leader-teaching.jpg", label: "Leader teaching" },
  { path: "/media/worship-practice.jpg", label: "Worship practice" },
  { path: "/media/prayer-meeting.jpg", label: "Prayer meeting" },
  { path: "/media/community-group.jpg", label: "Community group" },
  { path: "/media/church-picnic.jpg", label: "Church picnic" },
  { path: "/media/campus-picnic.jpg", label: "Campus picnic" },
  { path: "/media/cya-shirts.jpg", label: "CYA shirts" },
  { path: "/media/step-in-shine-out.jpg", label: "Step in, shine out" },
  { path: "/media/light-tunnel.jpg", label: "Light tunnel" },
  { path: "/media/tree-guitar.jpg", label: "Tree and guitar" },
  { path: "/media/golden-selfie.jpg", label: "Golden selfie" },
  { path: "/media/member-joy.jpg", label: "Member joy" },
] as const;

export const eventTags = [
  "Youth Camp",
  "Fellowship",
  "Leadership",
  "Worship",
  "Outreach",
  "Prayer",
  "Training",
  "Event",
] as const;
