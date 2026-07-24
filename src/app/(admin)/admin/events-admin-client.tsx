"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  CalendarPlus,
  CalendarX,
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  MapPin,
  Mic,
  Pencil,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { Badge, Button, Card, EmptyState, Field, inputClass } from "@/components/ui";
import { toast } from "@/components/toast";
import { compressImage } from "@/lib/compress-image";
import { cx } from "@/lib/cx";
import { eventTags } from "@/lib/media";
import type { EventItem } from "@/lib/types";

type Draft = Omit<EventItem, "id" | "displayDate" | "rsvpCount" | "rsvped">;

const DESCRIPTION_MAX = 800;

const EMPTY: Draft = {
  title: "",
  date: "",
  time: "",
  location: "",
  description: "",
  speaker: "",
  tag: "Event",
  image: "",
  published: true,
};

const hasImage = (src: string) => Boolean(src);

const todayKey = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());

/** Strips the server-owned fields so the form only holds what an admin edits. */
function toDraft(event: EventItem): Draft {
  return {
    title: event.title,
    date: event.date,
    time: event.time,
    location: event.location,
    description: event.description ?? "",
    speaker: event.speaker,
    tag: event.tag,
    image: event.image,
    published: event.published,
  };
}

export function EventsAdminClient({ initialEvents }: { initialEvents: EventItem[] }) {
  const reduce = useReducedMotion();
  const [events, setEvents] = useState(initialEvents);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<EventItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const today = todayKey();
  const { upcoming, past } = useMemo(() => {
    const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
    return {
      upcoming: sorted.filter((e) => e.date >= today),
      past: sorted.filter((e) => e.date < today).reverse(),
    };
  }, [events, today]);

  const openCreate = () => {
    setEditing(null);
    setDraft({ ...EMPTY });
    setErrors({});
    setServerError("");
    setCreating(true);
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const openEdit = (event: EventItem) => {
    setCreating(false);
    setEditing(event);
    setErrors({});
    setServerError("");
    setDraft(toDraft(event));
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
    setErrors({});
    setServerError("");
  };

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const onPickFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Choose an image file (JPG, PNG, or WebP).", "error");
      return;
    }

    setUploading(true);
    try {
      // Shrink first: a phone photo or pubmat export is usually far over the limit.
      const compressed = await compressImage(file);
      const body = new FormData();
      body.append("file", compressed);

      const res = await fetch("/api/admin/events/image", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error ?? "Could not upload that image.", "error");
        return;
      }
      set("image", data.url);
      const kb = Math.round(data.bytes / 1024);
      toast(`Pubmat uploaded (${kb}KB)`, "success");
    } catch {
      toast("Could not read that image.", "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (draft.title.trim().length < 3) next.title = "Give the event a title (at least 3 characters).";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) next.date = "Pick a date for this event.";
    if (!draft.time.trim()) next.time = "Add a start time, e.g. 1:00 PM.";
    if (draft.location.trim().length < 2) next.location = "Where is it happening?";
    if (!draft.image) next.image = "Upload a pubmat for this event.";
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) document.getElementById(`ev-${first}`)?.focus();
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || !validate()) return;

    const isEdit = Boolean(editing);
    setBusy("save");
    setServerError("");
    try {
      const res = await fetch(isEdit ? `/api/admin/events/${editing!.id}` : "/api/admin/events", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setServerError(data.error ?? "Could not save that event.");
        return;
      }
      setEvents((list) =>
        isEdit ? list.map((x) => (x.id === data.event.id ? data.event : x)) : [data.event, ...list]
      );
      toast(isEdit ? "Event updated" : "Event published", "success");
      closeForm();
    } catch {
      setServerError("Network error — check your connection and try again.");
    } finally {
      setBusy("");
    }
  };

  const togglePublished = async (event: EventItem) => {
    setBusy(event.id);
    try {
      const res = await fetch(`/api/admin/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...toDraft(event), published: !event.published }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error ?? "Could not update that event.", "error");
        return;
      }
      setEvents((list) => list.map((x) => (x.id === event.id ? data.event : x)));
      toast(data.event.published ? "Now visible on the events page" : "Hidden from the events page", "info");
    } catch {
      toast("Network error — try again.", "error");
    } finally {
      setBusy("");
    }
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    const target = confirmDelete;
    setBusy(target.id);
    try {
      const res = await fetch(`/api/admin/events/${target.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error ?? "Could not delete that event.", "error");
        return;
      }
      setEvents((list) => list.filter((x) => x.id !== target.id));
      if (editing?.id === target.id) closeForm();
      toast(`Deleted "${target.title}"`, "info");
    } catch {
      toast("Network error — try again.", "error");
    } finally {
      setBusy("");
      setConfirmDelete(null);
    }
  };

  const formOpen = creating || Boolean(editing);

  return (
    <div className="space-y-10">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2 text-sm font-semibold text-ink-faint">
          <span className="rounded-full bg-sky-soft px-3 py-1.5">
            {upcoming.length} upcoming
          </span>
          <span className="rounded-full bg-sky-soft px-3 py-1.5">{past.length} past</span>
          <span className="rounded-full bg-sky-soft px-3 py-1.5">
            {events.filter((e) => !e.published).length} hidden
          </span>
        </div>
        <Button onClick={openCreate} disabled={creating}>
          <CalendarPlus className="h-[18px] w-[18px]" aria-hidden />
          New event
        </Button>
      </div>

      {/* Create / edit form */}
      <div ref={formRef}>
        <AnimatePresence initial={false}>
          {formOpen && (
            <motion.div
              initial={reduce ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={reduce ? undefined : { opacity: 0, height: 0 }}
              transition={{ duration: 0.26 }}
              className="overflow-hidden"
            >
              <Card hover={false} className="p-8" ring>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-ink">
                      {editing ? "Edit event" : "New event"}
                    </h2>
                    <p className="mt-1 text-sm text-ink-soft">
                      {editing
                        ? "Changes go live on the events page as soon as you save."
                        : "Published events appear on the public events page immediately."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeForm}
                    aria-label="Close form"
                    className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-sky-soft hover:text-ink"
                  >
                    <X className="h-5 w-5" aria-hidden />
                  </button>
                </div>

                <form onSubmit={onSubmit} noValidate className="mt-7 space-y-5">
                  <Field label="Event title" id="ev-title" required error={errors.title}>
                    <input
                      id="ev-title"
                      value={draft.title}
                      onChange={(e) => set("title", e.target.value)}
                      className={inputClass}
                      placeholder="e.g. Step In, Shine Out: Youth Encounter"
                      aria-invalid={!!errors.title}
                    />
                  </Field>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Date" id="ev-date" required error={errors.date}>
                      <input
                        id="ev-date"
                        type="date"
                        value={draft.date}
                        onChange={(e) => set("date", e.target.value)}
                        className={inputClass}
                        aria-invalid={!!errors.date}
                      />
                    </Field>
                    <Field
                      label="Start time"
                      id="ev-time"
                      required
                      error={errors.time}
                      help="Written as you want it shown, e.g. 1:00 PM."
                    >
                      <input
                        id="ev-time"
                        value={draft.time}
                        onChange={(e) => set("time", e.target.value)}
                        className={inputClass}
                        placeholder="1:00 PM"
                        aria-invalid={!!errors.time}
                      />
                    </Field>
                  </div>

                  <Field label="Location" id="ev-location" required error={errors.location}>
                    <input
                      id="ev-location"
                      value={draft.location}
                      onChange={(e) => set("location", e.target.value)}
                      className={inputClass}
                      placeholder="CYA Main Hall, Quezon City"
                      aria-invalid={!!errors.location}
                    />
                  </Field>

                  <Field
                    label="Description"
                    id="ev-description"
                    help={`What should people know before they come? ${
                      DESCRIPTION_MAX - draft.description.length
                    } characters left.`}
                  >
                    <textarea
                      id="ev-description"
                      value={draft.description}
                      onChange={(e) => set("description", e.target.value.slice(0, DESCRIPTION_MAX))}
                      rows={4}
                      maxLength={DESCRIPTION_MAX}
                      placeholder="Who it's for, what to bring, how to register…"
                      className="w-full resize-none rounded-2xl border border-line bg-surface p-4 text-[15px] leading-relaxed text-ink outline-none transition-colors duration-200 placeholder:text-ink-faint focus:border-primary"
                    />
                  </Field>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Speaker or host" id="ev-speaker">
                      <input
                        id="ev-speaker"
                        value={draft.speaker}
                        onChange={(e) => set("speaker", e.target.value)}
                        className={inputClass}
                        placeholder="Optional"
                      />
                    </Field>
                    <Field label="Tag" id="ev-tag">
                      <select
                        id="ev-tag"
                        value={draft.tag}
                        onChange={(e) => set("tag", e.target.value)}
                        className={cx(inputClass, "cursor-pointer")}
                      >
                        {eventTags.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <fieldset>
                    <legend className="text-sm font-bold text-ink">
                      Pubmat
                      <span aria-hidden className="ml-1 text-danger">
                        *
                      </span>
                    </legend>

                    <div
                      className={cx(
                        "mt-3 flex flex-wrap items-center gap-4 rounded-2xl border border-dashed p-4 transition-colors",
                        errors.image ? "border-danger" : "border-line"
                      )}
                    >
                      {hasImage(draft.image) ? (
                        <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl">
                          <Image
                            src={draft.image}
                            alt="Pubmat preview"
                            fill
                            sizes="128px"
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <span className="grid h-24 w-32 shrink-0 place-items-center rounded-xl bg-sky-soft text-ink-faint">
                          <ImagePlus className="h-6 w-6" aria-hidden />
                        </span>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-ink">
                          {hasImage(draft.image) ? "Pubmat ready" : "Upload the event pubmat"}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                          JPG, PNG, or WebP from your device. Large images are shrunk automatically.
                        </p>
                      </div>

                      <input
                        ref={fileRef}
                        id="ev-image"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        aria-invalid={!!errors.image}
                        onChange={(e) => onPickFile(e.target.files?.[0])}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploading}
                        onClick={() => fileRef.current?.click()}
                      >
                        {uploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <Upload className="h-4 w-4" aria-hidden />
                        )}
                        {uploading ? "Uploading…" : hasImage(draft.image) ? "Replace" : "Choose file"}
                      </Button>
                    </div>

                    {errors.image && (
                      <p role="alert" className="mt-2 text-sm font-semibold text-danger">
                        {errors.image}
                      </p>
                    )}
                  </fieldset>

                  <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold text-ink-soft">
                    <input
                      type="checkbox"
                      checked={draft.published}
                      onChange={(e) => set("published", e.target.checked)}
                      className="h-5 w-5 cursor-pointer rounded accent-[#0095ff]"
                    />
                    Visible on the public events page
                  </label>

                  {serverError && (
                    <p
                      role="alert"
                      className="rounded-2xl bg-danger/10 px-4 py-3 text-sm font-semibold text-danger"
                    >
                      {serverError}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <Button type="submit" size="lg" disabled={busy === "save"}>
                      {busy === "save" && (
                        <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden />
                      )}
                      {editing ? "Save changes" : "Publish event"}
                    </Button>
                    <Button type="button" variant="outline" size="lg" onClick={closeForm}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Lists */}
      <EventSection
        title="Upcoming"
        events={upcoming}
        emptyTitle="No upcoming events"
        emptyBody="Create one and it appears on the public events page straight away."
        busy={busy}
        onEdit={openEdit}
        onToggle={togglePublished}
        onDelete={setConfirmDelete}
      />

      {past.length > 0 && (
        <EventSection
          title="Past"
          events={past}
          muted
          busy={busy}
          onEdit={openEdit}
          onToggle={togglePublished}
          onDelete={setConfirmDelete}
        />
      )}

      {/* Delete confirmation */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            className="fixed inset-0 z-[200] grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="del-title"
              initial={reduce ? false : { opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.22 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-[2rem] bg-surface p-8 shadow-lift"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-danger/10 text-danger">
                <CalendarX className="h-6 w-6" aria-hidden />
              </span>
              <h2 id="del-title" className="mt-5 text-xl font-extrabold text-ink">
                Delete this event?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                <span className="font-bold text-ink">{confirmDelete.title}</span>{" "}
                will be removed permanently. This can&apos;t be undone — hide it instead if you only
                want it off the page for now.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button
                  onClick={doDelete}
                  disabled={busy === confirmDelete.id}
                  className="!bg-danger hover:!bg-danger"
                >
                  {busy === confirmDelete.id && (
                    <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden />
                  )}
                  Delete permanently
                </Button>
                <Button variant="outline" onClick={() => setConfirmDelete(null)}>
                  Keep it
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EventSection({
  title,
  events,
  emptyTitle,
  emptyBody,
  muted = false,
  busy,
  onEdit,
  onToggle,
  onDelete,
}: {
  title: string;
  events: EventItem[];
  emptyTitle?: string;
  emptyBody?: string;
  muted?: boolean;
  busy: string;
  onEdit: (e: EventItem) => void;
  onToggle: (e: EventItem) => void;
  onDelete: (e: EventItem) => void;
}) {
  return (
    <section aria-label={`${title} events`}>
      <h2 className="text-sm font-extrabold uppercase tracking-[0.15em] text-ink-faint">
        {title} · {events.length}
      </h2>

      {events.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={<CalendarPlus className="h-10 w-10" aria-hidden />}
            title={emptyTitle ?? "Nothing here"}
            body={emptyBody ?? ""}
          />
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          <AnimatePresence initial={false}>
            {events.map((e) => (
              <motion.li
                key={e.id}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.24 }}
              >
                <Card
                  hover={false}
                  className={cx("flex flex-col gap-4 p-4 sm:flex-row sm:items-center", muted && "opacity-70")}
                >
                  <div className="relative h-20 w-full shrink-0 overflow-hidden rounded-2xl sm:w-28">
                    <Image
                      src={e.image}
                      alt=""
                      fill
                      sizes="112px"
                      className="object-cover"
                      unoptimized={e.image.startsWith("/api/images/")}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="sky">{e.tag}</Badge>
                      {!e.published && <Badge tone="gold">Hidden</Badge>}
                    </div>
                    <h3 className="mt-1.5 truncate text-[15px] font-extrabold text-ink">{e.title}</h3>
                    {e.description && (
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-soft">
                        {e.description}
                      </p>
                    )}
                    <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-soft">
                      <span className="font-semibold text-ink">
                        {e.displayDate} · {e.time}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" aria-hidden />
                        {e.location}
                      </span>
                      {e.speaker && (
                        <span className="inline-flex items-center gap-1">
                          <Mic className="h-3.5 w-3.5" aria-hidden />
                          {e.speaker}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 font-semibold text-primary-700">
                        <Users className="h-3.5 w-3.5" aria-hidden />
                        {e.rsvpCount} going
                      </span>
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <IconAction
                      label={e.published ? `Hide ${e.title}` : `Show ${e.title}`}
                      onClick={() => onToggle(e)}
                      busy={busy === e.id}
                      icon={e.published ? EyeOff : Eye}
                    />
                    <IconAction
                      label={`Edit ${e.title}`}
                      onClick={() => onEdit(e)}
                      icon={Pencil}
                    />
                    {/* Destructive action kept visually separate from the rest. */}
                    <span className="mx-1 h-6 w-px bg-line" aria-hidden />
                    <IconAction
                      label={`Delete ${e.title}`}
                      onClick={() => onDelete(e)}
                      icon={Trash2}
                      danger
                    />
                  </div>
                </Card>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}

function IconAction({
  label,
  onClick,
  icon: Icon,
  busy = false,
  danger = false,
}: {
  label: string;
  onClick: () => void;
  icon: typeof Pencil;
  busy?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 disabled:opacity-40",
        danger
          ? "text-ink-faint hover:bg-danger/10 hover:text-danger"
          : "text-ink-faint hover:bg-sky-soft hover:text-primary-700"
      )}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Icon className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}
