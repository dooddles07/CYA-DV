"use client";

import { useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { BookOpen, Eye, EyeOff, Loader2, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { Badge, Button, Card, EmptyState, Field, inputClass } from "@/components/ui";
import { toast } from "@/components/toast";
import { csrfHeader } from "@/lib/csrf";
import { compressImage } from "@/lib/compress-image";
import { cx } from "@/lib/cx";
import type { Devotion } from "@/lib/types";

type Draft = Omit<Devotion, "id" | "published"> & { body: string[] };

const EMPTY: Draft = {
  slug: "",
  title: "",
  excerpt: "",
  author: "",
  readTime: "3 min",
  date: "",
  verse: "",
  verseText: "",
  image: "",
  imageAlt: "",
  body: [],
  practice: "",
};

function toDraft(d: Devotion): Draft {
  return {
    slug: d.slug,
    title: d.title,
    excerpt: d.excerpt,
    author: d.author,
    readTime: d.readTime,
    date: d.date,
    verse: d.verse,
    verseText: d.verseText,
    image: d.image,
    imageAlt: d.imageAlt,
    body: d.body,
    practice: d.practice,
  };
}

export function DevotionsAdminClient({ initialDevotions }: { initialDevotions: Devotion[] }) {
  const [items, setItems] = useState(initialDevotions);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [bodyText, setBodyText] = useState("");
  const [busy, setBusy] = useState("");
  const [uploading, setUploading] = useState(false);
  const [serverError, setServerError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const openNew = () => {
    setDraft(EMPTY);
    setBodyText("");
    setServerError("");
    setEditing("new");
  };
  const openEdit = (d: Devotion) => {
    setDraft(toDraft(d));
    setBodyText(d.body.join("\n\n"));
    setServerError("");
    setEditing(d.id);
  };
  const close = () => setEditing(null);

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Choose an image file (JPG, PNG, or WebP).", "error");
      return;
    }
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const body = new FormData();
      body.append("file", compressed);
      const res = await fetch("/api/admin/events/image", { method: "POST", headers: csrfHeader(), body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error ?? "Could not upload that image.", "error");
        return;
      }
      set("image", data.url);
      toast(`Image uploaded (${Math.round(data.bytes / 1024)}KB)`, "success");
    } catch {
      toast("Could not read that image.", "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (draft.title.trim().length < 3) {
      setServerError("Give the devotional a title (at least 3 characters).");
      return;
    }
    if (!draft.image) {
      setServerError("Upload a cover image.");
      return;
    }

    const isEdit = editing !== "new";
    const payload = { ...draft, body: bodyText.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean) };
    setBusy("save");
    setServerError("");
    try {
      const res = await fetch(isEdit ? `/api/admin/devotions/${editing}` : "/api/admin/devotions", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...csrfHeader() },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setServerError(data.error ?? "Could not save.");
        return;
      }
      const saved: Devotion = data.devotion;
      setItems((list) =>
        isEdit ? list.map((i) => (i.id === saved.id ? saved : i)) : [saved, ...list]
      );
      toast(isEdit ? "Devotional saved" : "Devotional published", "success");
      close();
    } catch {
      setServerError("Network error — try again.");
    } finally {
      setBusy("");
    }
  };

  const onToggle = async (d: Devotion) => {
    setBusy(d.id);
    try {
      const res = await fetch(`/api/admin/devotions/${d.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...csrfHeader() },
        body: JSON.stringify({ ...d, published: !d.published }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error ?? "Could not update.", "error");
        return;
      }
      setItems((list) => list.map((i) => (i.id === d.id ? data.devotion : i)));
      toast(d.published ? "Hidden from the reading page" : "Published", "info");
    } catch {
      toast("Network error — try again.", "error");
    } finally {
      setBusy("");
    }
  };

  const onDelete = async (d: Devotion) => {
    if (!confirm(`Delete "${d.title}"? This cannot be undone.`)) return;
    setBusy(d.id);
    try {
      const res = await fetch(`/api/admin/devotions/${d.id}`, { method: "DELETE", headers: csrfHeader() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error ?? "Could not delete.", "error");
        return;
      }
      setItems((list) => list.filter((i) => i.id !== d.id));
      toast("Devotional deleted", "info");
    } catch {
      toast("Network error — try again.", "error");
    } finally {
      setBusy("");
    }
  };

  return (
    <div>
      <div className="mb-6 flex justify-end">
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" aria-hidden />
          New devotional
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-10 w-10" aria-hidden />}
          title="No devotionals yet"
          body="Write the first one — it appears on the reading page straight away."
        />
      ) : (
        <ul className="space-y-3">
          {items.map((d) => (
            <li key={d.id}>
              <Card
                hover={false}
                className={cx("flex flex-col gap-4 p-4 sm:flex-row sm:items-center", !d.published && "opacity-70")}
              >
                <div className="relative h-20 w-full shrink-0 overflow-hidden rounded-2xl sm:w-28">
                  <Image
                    src={d.image}
                    alt=""
                    fill
                    sizes="112px"
                    className="object-cover"
                    unoptimized={d.image.startsWith("/api/images/")}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {d.verse && <Badge tone="sky">{d.verse}</Badge>}
                    {!d.published && <Badge tone="gold">Hidden</Badge>}
                  </div>
                  <h3 className="mt-1.5 truncate text-[15px] font-extrabold text-ink">{d.title}</h3>
                  <p className="mt-1 truncate text-xs text-ink-soft">
                    /devotion/{d.slug} · {d.author || "—"} · {d.date || "no date"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <IconBtn label={d.published ? "Hide" : "Show"} onClick={() => onToggle(d)} busy={busy === d.id} icon={d.published ? EyeOff : Eye} />
                  <IconBtn label="Edit" onClick={() => openEdit(d)} icon={Pencil} />
                  <IconBtn label="Delete" onClick={() => onDelete(d)} icon={Trash2} danger />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <div className="fixed inset-0 z-[140] flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8">
          <Card hover={false} className="relative w-full max-w-2xl p-6 sm:p-8">
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-faint hover:bg-sky-soft"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
            <h2 className="text-xl font-extrabold text-ink">
              {editing === "new" ? "New devotional" : "Edit devotional"}
            </h2>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <Field label="Title" id="dv-title" required>
                <input id="dv-title" className={inputClass} value={draft.title} onChange={(e) => set("title", e.target.value)} />
              </Field>
              <Field label="Link slug" id="dv-slug" help="Leave blank to derive it from the title.">
                <input id="dv-slug" className={inputClass} value={draft.slug} onChange={(e) => set("slug", e.target.value)} placeholder="wings-like-eagles" />
              </Field>
              <Field label="Excerpt" id="dv-excerpt">
                <input id="dv-excerpt" className={inputClass} value={draft.excerpt} onChange={(e) => set("excerpt", e.target.value)} />
              </Field>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Author" id="dv-author">
                  <input id="dv-author" className={inputClass} value={draft.author} onChange={(e) => set("author", e.target.value)} />
                </Field>
                <Field label="Read time" id="dv-read">
                  <input id="dv-read" className={inputClass} value={draft.readTime} onChange={(e) => set("readTime", e.target.value)} />
                </Field>
                <Field label="Date" id="dv-date">
                  <input id="dv-date" className={inputClass} value={draft.date} onChange={(e) => set("date", e.target.value)} placeholder="July 17, 2026" />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Verse reference" id="dv-verse">
                  <input id="dv-verse" className={inputClass} value={draft.verse} onChange={(e) => set("verse", e.target.value)} placeholder="Isaiah 40:31" />
                </Field>
                <Field label="Verse text" id="dv-versetext">
                  <input id="dv-versetext" className={inputClass} value={draft.verseText} onChange={(e) => set("verseText", e.target.value)} />
                </Field>
              </div>

              <Field label="Cover image" id="dv-image" required>
                <div className="flex items-center gap-3">
                  {draft.image && (
                    <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl">
                      <Image src={draft.image} alt="" fill sizes="96px" className="object-cover" unoptimized={draft.image.startsWith("/api/images/")} />
                    </div>
                  )}
                  <input ref={fileRef} id="dv-image" type="file" accept="image/*" className="hidden" onChange={(e) => onUpload(e.target.files?.[0])} />
                  <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Upload className="h-4 w-4" aria-hidden />}
                    {draft.image ? "Replace" : "Upload"}
                  </Button>
                </div>
              </Field>
              <Field label="Image alt text" id="dv-alt">
                <input id="dv-alt" className={inputClass} value={draft.imageAlt} onChange={(e) => set("imageAlt", e.target.value)} />
              </Field>

              <Field label="Body" id="dv-body" help="Separate paragraphs with a blank line.">
                <textarea id="dv-body" rows={8} className={cx(inputClass, "h-auto py-3")} value={bodyText} onChange={(e) => setBodyText(e.target.value)} />
              </Field>
              <Field label="Practice / today try this" id="dv-practice">
                <textarea id="dv-practice" rows={3} className={cx(inputClass, "h-auto py-3")} value={draft.practice} onChange={(e) => set("practice", e.target.value)} />
              </Field>

              {serverError && <p role="alert" className="text-sm font-semibold text-danger">{serverError}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={close}>Cancel</Button>
                <Button type="submit" disabled={busy === "save"}>
                  {busy === "save" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                  {editing === "new" ? "Publish" : "Save changes"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  icon: Icon,
  busy,
  danger,
}: {
  label: string;
  onClick: () => void;
  icon: typeof Eye;
  busy?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={busy}
      className={cx(
        "inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors",
        danger ? "text-danger hover:bg-danger/10" : "text-ink-soft hover:bg-sky-soft"
      )}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Icon className="h-4 w-4" aria-hidden />}
    </button>
  );
}
