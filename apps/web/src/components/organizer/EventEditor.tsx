"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  Eye,
  Globe,
  Mail,
  MapPin,
  Pause,
  Phone,
  Play,
  User,
} from "lucide-react";
import { CategoryIcon, coverGradients, coverIconClass } from "@/components/events/CategoryIcon";
import { Button, LinkButton } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { RichTextEditor } from "@/components/ui/RichTextEditorLazy";
import { Badge } from "@/components/ui/StatusBadge";
import { fileToCoverDataUrl } from "@/lib/image";
import { changeHistory, eventCategories, eventStatusLabel, formatEventDate, type OrganizerEvent } from "@/lib/organizer";
import { useOrganizer } from "./OrganizerContext";
import { Dialog, OrgPageHeader, Panel } from "./ui";
import { Select } from "@/components/ui/Select";

type Form = {
  name: string;
  category: string;
  tags: string;
  description: string;
  date: string;
  doorsOpen: string;
  starts: string;
  venue: string;
  address: string;
  organizerName: string;
  organizerAbout: string;
  organizerEmail: string;
  organizerPhone: string;
  organizerLink: string;
};

const saved: Record<string, Form> = {
  "music-night": {
    name: "Sri Lankan Music Night",
    category: "Concert",
    tags: "Live music · DJ",
    description:
      "An evening of Sinhala and Tamil songs performed live by Sri Lankan bands based in Korea, followed by a DJ set until late.",
    date: "2026-11-14",
    doorsOpen: "17:30",
    starts: "18:00",
    venue: "Hongdae Live Hall",
    address: "Mapo-gu, Seoul",
    organizerName: "Lanka Beats Korea",
    organizerAbout: "",
    organizerEmail: "",
    organizerPhone: "",
    organizerLink: "",
  },
};

const fmtTime = (t: string) => {
  const [h = "0", m = "00"] = t.split(":");
  const hour = Number(h);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
};
const fmtDate = (iso: string) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

/**
 * Waits for the browser store to hydrate before mounting the form, so a saved draft never opens blank: the form
 * reads its initial values once.
 */
export function EventEditor({ id }: { id: string }) {
  const { events } = useOrganizer();
  const hydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const event = events.find((e) => e.id === id);

  if (!hydrated) return <p className="text-sm text-muted">Loading event…</p>;
  if (!event) {
    return (
      <Panel className="p-10 text-center">
        <p className="text-base font-bold text-text">Event not found</p>
        <p className="mt-2 text-sm text-muted">Drafts are kept in the browser they were created in.</p>
        <LinkButton href="/organizer/events" className="mt-5">
          Back to events
        </LinkButton>
      </Panel>
    );
  }
  return <EventEditorForm key={id} id={id} event={event} />;
}

function EventEditorForm({ id, event }: { id: string; event: OrganizerEvent }) {
  const { updateEvent } = useOrganizer();

  const initial = useMemo<Form>(() => {
    const d = event.draft;
    if (d) {
      return {
        name: d.name,
        category: d.category,
        tags: d.tags,
        description: d.description,
        date: d.date,
        doorsOpen: d.doorsOpen,
        starts: d.starts,
        venue: d.venue,
        address: d.address,
        organizerName: d.organizerName ?? "",
        organizerAbout: d.organizerAbout ?? "",
        organizerEmail: d.organizerEmail ?? "",
        organizerPhone: d.organizerPhone ?? "",
        organizerLink: d.organizerLink ?? "",
      };
    }
    return (
      saved[id] ?? {
        name: event.title,
        category: "Culture",
        tags: "",
        description: "",
        date: "",
        doorsOpen: "17:30",
        starts: "18:00",
        venue: "",
        address: "",
        organizerName: "",
        organizerAbout: "",
        organizerEmail: "",
        organizerPhone: "",
        organizerLink: "",
      }
    );
    // The form only reads its starting values once; later edits live in `form`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [form, setForm] = useState<Form>(initial);
  // The last saved values; unsaved edits are highlighted against this.
  const [baseline, setBaseline] = useState<Form>(initial);
  const [notify, setNotify] = useState(true);
  const [message, setMessage] = useState("");
  const [paused, setPaused] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [toast, setToast] = useState<string>();
  const [cover, setCover] = useState({
    name: event.draft ? event.draft.coverName || "No cover image yet" : "cover-music-night.jpg",
    url: event.draft?.coverUrl ?? "",
  });
  const [coverError, setCoverError] = useState<string>();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(undefined), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const set = (p: Partial<Form>) => setForm((f) => ({ ...f, ...p }));
  const changed = {
    date: form.date !== baseline.date,
    doorsOpen: form.doorsOpen !== baseline.doorsOpen,
    starts: form.starts !== baseline.starts,
    venue: form.venue !== baseline.venue,
    address: form.address !== baseline.address,
  };
  const sensitive = Object.values(changed).some(Boolean);
  const dirty = sensitive || (Object.keys(form) as (keyof Form)[]).some((k) => form[k] !== baseline[k]);

  // Pre-write the buyer message from what actually changed, until the organizer edits it.
  const autoMessage = useMemo(() => {
    const parts: string[] = [];
    if (changed.starts) parts.push(`The show now starts at ${fmtTime(form.starts)}.`);
    if (changed.doorsOpen) parts.push(`Doors now open at ${fmtTime(form.doorsOpen)}.`);
    if (changed.date) parts.push(`The date is now ${fmtDate(form.date)}.`);
    if (changed.venue || changed.address) parts.push(`The venue is now ${form.venue}, ${form.address}.`);
    if (parts.length) parts.push("Your tickets stay valid.");
    return parts.join(" ");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.starts, form.doorsOpen, form.date, form.venue, form.address]);
  const shownMessage = message || autoMessage;

  const history = [
    ...(changed.starts ? [{ label: `Start time ${fmtTime(baseline.starts)} → ${fmtTime(form.starts)}`, meta: "Not saved yet", pending: true }] : []),
    ...changeHistory.map((h) => ({ ...h, pending: false })),
  ];

  function save() {
    // TODO: persist through the API and queue the notification email when `notify` is on.
    const patch: Partial<OrganizerEvent> = { title: form.name.trim() || event.title };
    if (event.draft) {
      patch.draft = { ...event.draft, ...form, coverUrl: cover.url, coverName: cover.url ? cover.name : "" };
      patch.dateLabel = formatEventDate(form.date);
      patch.shortDate = patch.dateLabel;
      patch.startsAt = form.date ? `${form.date}T${form.starts || "18:00"}:00+09:00` : undefined;
      patch.venue = [form.venue, form.address].filter(Boolean).join(", ") || undefined;
    }
    updateEvent(id, patch);
    setBaseline(form);
    setToast(
      sensitive && notify
        ? `Saved. ${event.sold} ticket holders will be emailed about the change.`
        : "Saved.",
    );
    setMessage("");
  }

  const statusLabel = cancelled ? "Cancelled" : paused ? "Published · sales paused" : event.status === "on_sale" ? "Published · on sale" : eventStatusLabel[event.status];

  return (
    <>
      <OrgPageHeader
        crumbs={[{ label: "Events", href: "/organizer/events" }, { label: event.title }, { label: "Edit" }]}
        title="Edit event"
        titleAside={
          <Badge tone={cancelled ? "danger" : paused ? "warning" : "success"} dot>
            {statusLabel}
          </Badge>
        }
        actions={
          <>
            <LinkButton href={id === "music-night" ? "/events/sri-lankan-music-night" : "/events"} variant="outline" className="border-line bg-surface text-text hover:bg-surface-2">
              <Eye size={16} aria-hidden /> Preview
            </LinkButton>
            <Button onClick={save} disabled={!dirty || cancelled}>
              Save changes
            </Button>
          </>
        }
      >
        <nav aria-label="Event sections" className="mt-5 flex gap-1 overflow-x-auto border-b border-line">
          <span aria-current="page" className="-mb-px border-b-2 border-amber px-3 py-2.5 text-[13px] font-bold text-gold">
            Details
          </span>
          <Link href="/organizer/ticket-types" className="px-3 py-2.5 text-[13px] font-bold text-muted hover:text-text">
            Tickets &amp; seating
          </Link>
          <Link href="/organizer/pricing" className="px-3 py-2.5 text-[13px] font-bold text-muted hover:text-text">
            Pricing
          </Link>
          {event.status !== "draft" && (
            <Link href={`/organizer/events/${id}/operations`} className="px-3 py-2.5 text-[13px] font-bold text-muted hover:text-text">
              Operations
            </Link>
          )}
          <span aria-disabled="true" title="Not available yet" className="cursor-not-allowed px-3 py-2.5 text-[13px] font-bold text-dim">
            Page settings
          </span>
        </nav>
      </OrgPageHeader>

      {toast && (
        <p role="status" className="mb-4 flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm text-text">
          <CheckCircle2 size={16} aria-hidden className="text-success" /> {toast}
        </p>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[1fr_20rem]">
        <div className="space-y-5">
          {event.sold > 0 && (
            <p className="flex items-start gap-3 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-[13px] text-text">
              <AlertTriangle size={16} aria-hidden className="mt-0.5 shrink-0 text-danger" />
              {event.sold} tickets are sold. If you change the date, time or venue, ticket holders must be told.
            </p>
          )}

          <Panel className="p-5 sm:p-6">
            <h2 className="mb-5 text-lg font-bold text-text">Basics</h2>
            <div className="space-y-5">
              <Field label="Event name" value={form.name} onChange={(e) => set({ name: e.target.value })} />
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="edit-category" className="mb-2 block text-xs font-bold text-muted">
                    Category
                  </label>
                  <div className="relative">
                    <Select
                      id="edit-category"
                      value={form.category}
                      onChange={(e) => set({ category: e.target.value })}
                      className="h-12 w-full rounded-lg border border-line bg-surface px-4 text-sm text-text focus:border-gold focus:outline-none"
                    >
                      {eventCategories.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </Select>
                  </div>
                </div>
                <Field label="Short tags" value={form.tags} onChange={(e) => set({ tags: e.target.value })} />
              </div>
              <RichTextEditor
                label="Description"
                value={form.description}
                onChange={(html) => set({ description: html })}
                hint="Select text to make it bold, add a link or build a list."
                minHeightClass="min-h-44"
              />
            </div>
          </Panel>

          <Panel className="p-5 sm:p-6">
            <h2 className="mb-5 text-lg font-bold text-text">Date and place</h2>
            <div className="grid gap-5 sm:grid-cols-3">
              <Marked on={changed.date} note={`Changed from ${fmtDate(baseline.date)}`}>
                <Field label="Date" type="date" icon={<CalendarDays />} value={form.date} onChange={(e) => set({ date: e.target.value })} />
              </Marked>
              <Marked on={changed.doorsOpen} note={`Changed from ${fmtTime(baseline.doorsOpen)}`}>
                <Field label="Doors open" type="time" icon={<Building2 />} value={form.doorsOpen} onChange={(e) => set({ doorsOpen: e.target.value })} />
              </Marked>
              <Marked on={changed.starts} note={`Changed from ${fmtTime(baseline.starts)}`}>
                <Field label="Starts" type="time" icon={<Clock />} value={form.starts} onChange={(e) => set({ starts: e.target.value })} />
              </Marked>
            </div>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Marked on={changed.venue} note={`Changed from ${baseline.venue}`}>
                <Field label="Venue name" value={form.venue} onChange={(e) => set({ venue: e.target.value })} />
              </Marked>
              <Marked on={changed.address} note={`Changed from ${baseline.address}`}>
                <Field label="Address" icon={<MapPin />} value={form.address} onChange={(e) => set({ address: e.target.value })} />
              </Marked>
            </div>

            {sensitive && event.sold > 0 && (
              <div className="mt-6 rounded-xl border border-amber/50 bg-amber/10 p-4">
                <label className="flex cursor-pointer items-center gap-3 text-[13px] text-text">
                  <input
                    type="checkbox"
                    checked={notify}
                    onChange={(e) => setNotify(e.target.checked)}
                    className="checkbox-box size-[18px] shrink-0 cursor-pointer appearance-none rounded border border-line bg-surface-2 checked:border-amber checked:bg-amber focus-visible:focus-ring"
                  />
                  Email and notify all {event.sold} ticket holders about this change
                </label>
                {notify && (
                  <>
                    <label htmlFor="notify-message" className="sr-only">
                      Message to ticket holders
                    </label>
                    <textarea
                      id="notify-message"
                      rows={3}
                      value={shownMessage}
                      onChange={(e) => setMessage(e.target.value)}
                      className="mt-3 w-full resize-none rounded-lg border border-line bg-surface-2 p-3 text-[13px] text-text focus:border-gold focus:outline-none"
                    />
                  </>
                )}
              </div>
            )}
          </Panel>

          <Panel className="p-5 sm:p-6">
            <h2 className="text-lg font-bold text-text">Organizer details</h2>
            <p className="mb-5 mt-1 text-[11px] text-dim">
              Shown on the event page so buyers know who is hosting and how to reach you.
            </p>
            <div className="space-y-5">
              <Field
                label="Organizer or group name"
                icon={<User />}
                value={form.organizerName}
                onChange={(e) => set({ organizerName: e.target.value })}
                autoComplete="organization"
              />
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Contact email"
                  type="email"
                  icon={<Mail />}
                  value={form.organizerEmail}
                  onChange={(e) => set({ organizerEmail: e.target.value })}
                  autoComplete="email"
                />
                <Field
                  label="Contact phone"
                  type="tel"
                  icon={<Phone />}
                  value={form.organizerPhone}
                  onChange={(e) => set({ organizerPhone: e.target.value })}
                  autoComplete="tel"
                />
              </div>
              <Field
                label="Website or social page (optional)"
                icon={<Globe />}
                value={form.organizerLink}
                onChange={(e) => set({ organizerLink: e.target.value })}
                placeholder="instagram.com/yourgroup"
              />
              <div>
                <label htmlFor="edit-organizer-about" className="mb-2 block text-xs font-bold text-muted">
                  About the organizer (optional)
                </label>
                <textarea
                  id="edit-organizer-about"
                  rows={3}
                  maxLength={500}
                  value={form.organizerAbout}
                  onChange={(e) => set({ organizerAbout: e.target.value })}
                  className="w-full resize-none rounded-lg border border-line bg-surface p-4 text-sm leading-relaxed text-text placeholder:text-dim focus:border-gold focus:outline-none"
                />
              </div>
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel className="overflow-hidden">
            <div
              className={`relative flex h-36 items-center justify-center bg-gradient-to-br ${coverGradients[event.category]}`}
            >
              {cover.url && (
                // eslint-disable-next-line @next/next/no-img-element -- organizer-uploaded data URL
                <img src={cover.url} alt="" className="absolute inset-0 size-full object-cover" />
              )}
              <span className="absolute left-3 top-3 rounded-full border border-gold/40 bg-black/70 px-2.5 py-1 text-[10px] font-bold uppercase text-gold">
                {form.category}
              </span>
              {!cover.url && <CategoryIcon id={event.category} size={48} strokeWidth={1.5} className={coverIconClass(event.category)} />}
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="truncate text-[11px] text-dim">{cover.name}</span>
              <label className="cursor-pointer text-xs font-bold text-amber hover:text-gold">
                Replace
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  className="sr-only"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (!["image/jpeg", "image/png"].includes(f.type)) return setCoverError("Use a JPG or PNG image.");
                    try {
                      setCover({ name: f.name, url: await fileToCoverDataUrl(f) });
                      setCoverError(undefined);
                    } catch {
                      setCoverError("That image couldn't be read.");
                    }
                  }}
                />
              </label>
            </div>
            {coverError && <p className="px-4 pb-3 text-xs text-danger">{coverError}</p>}
          </Panel>

          <Panel className="p-5">
            <h2 className="mb-4 text-base font-bold text-text">Change history</h2>
            <ol className="space-y-4">
              {history.map((h) => (
                <li key={h.label} className="flex gap-3">
                  <span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-full ${h.pending ? "bg-amber" : "bg-dim"}`} />
                  <span className="leading-tight">
                    <span className="block text-[13px] font-bold text-text">{h.label}</span>
                    <span className="mt-1 block text-[11px] text-dim">{"meta" in h ? h.meta : ""}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Panel>

          <section className="rounded-xl border border-danger/40 bg-surface p-5" aria-label="Stop or cancel">
            <h2 className="text-[13px] font-bold text-danger">Stop or cancel</h2>
            <Button
              variant="outline"
              className="mt-4 w-full border-line text-text hover:bg-surface-2"
              disabled={cancelled}
              onClick={() => setPaused((p) => !p)}
            >
              {paused ? <Play size={14} aria-hidden /> : <Pause size={14} aria-hidden />}
              {paused ? "Resume ticket sales" : "Pause ticket sales"}
            </Button>
            <Button
              variant="outline"
              className="mt-3 w-full border-danger/60 text-danger hover:bg-danger/10"
              disabled={cancelled}
              onClick={() => setCancelOpen(true)}
            >
              Cancel event
            </Button>
            <p className="mt-3 text-[11px] leading-relaxed text-dim">
              Cancelling takes the event off sale and cancels all 118 paid bookings. Buyers are told by email.
            </p>
          </section>
        </div>
      </div>

      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel this event?">
        <p className="text-sm leading-relaxed text-muted">
          <strong className="text-text">{event.title}</strong> will be taken off sale and all 118 paid bookings will be cancelled. Buyers are told by email.
          This can&apos;t be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setCancelOpen(false)}>
            Keep event
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              // TODO: call the cancel-event API.
              setCancelled(true);
              setCancelOpen(false);
              setToast("Event cancelled. Buyers are being told.");
            }}
          >
            Cancel event
          </Button>
        </div>
      </Dialog>
    </>
  );
}

/** Highlights a field that differs from the saved value and says what it was before. */
function Marked({ on, note, children }: { on: boolean; note: string; children: React.ReactNode }) {
  return (
    <div className={on ? "[&_div.flex.h-12]:border-amber" : ""}>
      {children}
      {on && <p className="mt-1.5 text-[11px] text-dim">{note}</p>}
    </div>
  );
}
