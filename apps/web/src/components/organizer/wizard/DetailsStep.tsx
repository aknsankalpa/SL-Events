"use client";

import { useId, useRef, useState } from "react";
import {
  Armchair,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  Globe,
  Image as ImageIcon,
  Info,
  Mail,
  MapPin,
  Phone,
  Tag,
  User,
} from "lucide-react";
import { Field } from "@/components/ui/Field";
import { RichTextEditor } from "@/components/ui/RichTextEditorLazy";
import { Badge } from "@/components/ui/StatusBadge";
import { fileToCoverDataUrl } from "@/lib/image";
import { eventCategories } from "@/lib/organizer";
import { isEmptyHtml } from "@/lib/richText";
import { Panel } from "../ui";
import { useOrganizerProfile } from "../useOrganizerProfile";
import { capacityOf, useEventDraft } from "./EventDraft";

export function DetailsStep() {
  const { draft, patch } = useEventDraft();
  const { profile } = useOrganizerProfile();
  const fileId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [coverError, setCoverError] = useState<string>();

  async function accept(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) return setCoverError("Use a JPG or PNG image.");
    if (file.size > 8 * 1024 * 1024) return setCoverError("That image is larger than 8 MB.");
    try {
      const coverUrl = await fileToCoverDataUrl(file);
      setCoverError(undefined);
      patch({ coverUrl, coverName: file.name });
    } catch {
      setCoverError("That image couldn't be read. Try a different file.");
    }
  }

  const basics = draft.name.trim() !== "" && !isEmptyHtml(draft.description);
  const place = draft.date !== "" && draft.venue.trim() !== "" && draft.address.trim() !== "";
  const host =
    !!draft.organizerName?.trim() && !!(draft.organizerEmail?.trim() || draft.organizerPhone?.trim() || draft.organizerLink?.trim());
  const tickets = draft.sellMode === "seats" ? draft.seatMap.sections.length > 0 : capacityOf(draft.ticketTypes).tickets > 0;
  const checklist = [
    { label: "Basics", done: basics },
    { label: "Date and place", done: place },
    { label: "Organizer details", done: host },
    { label: "Tickets & seating", done: tickets },
    { label: "Pricing", done: draft.pricingReviewed },
  ];

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[1fr_20rem]">
      <div className="space-y-5">
        <Panel className="p-5 sm:p-6">
          <h2 className="mb-5 text-lg font-bold text-text">Basics</h2>
          <div className="space-y-5">
            <Field label="Event name" value={draft.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Kandyan Dance Gala 2026" />
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="category" className="mb-2 block text-xs font-bold text-muted">
                  Category
                </label>
                <div className="relative">
                  <select
                    id="category"
                    value={draft.category}
                    onChange={(e) => patch({ category: e.target.value })}
                    className="h-12 w-full cursor-pointer appearance-none rounded-lg border border-line bg-surface px-4 pr-10 text-sm text-text focus:border-gold focus:outline-none"
                  >
                    {eventCategories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} aria-hidden className="pointer-events-none absolute right-4 top-4 text-muted" />
                </div>
              </div>
              <Field label="Short tags" value={draft.tags} onChange={(e) => patch({ tags: e.target.value })} placeholder="Dance · Drumming · Family" />
            </div>
            <RichTextEditor
              label="Description"
              value={draft.description}
              onChange={(html) => patch({ description: html })}
              placeholder="Tell people what to expect: the programme, who is performing, what to bring…"
              hint="Select text to make it bold, add a link or build a list."
              minHeightClass="min-h-44"
            />
          </div>
        </Panel>

        <Panel className="p-5 sm:p-6">
          <h2 className="mb-5 text-lg font-bold text-text">Date and place</h2>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Date" type="date" icon={<CalendarDays />} value={draft.date} onChange={(e) => patch({ date: e.target.value })} />
            <Field label="Doors open" type="time" icon={<Building2 />} value={draft.doorsOpen} onChange={(e) => patch({ doorsOpen: e.target.value })} />
            <Field label="Starts" type="time" icon={<Clock />} value={draft.starts} onChange={(e) => patch({ starts: e.target.value })} />
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <Field label="Venue name" value={draft.venue} onChange={(e) => patch({ venue: e.target.value })} placeholder="Ansan Arts Center, Main Hall" />
            <Field label="Address" icon={<MapPin />} value={draft.address} onChange={(e) => patch({ address: e.target.value })} placeholder="Danwon-gu, Ansan" />
          </div>
        </Panel>

        <Panel className="p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-text">Organizer details</h2>
              <p className="mt-1 text-[11px] text-dim">
                Shown on your event page so buyers know who is hosting and how to reach you.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                patch({
                  organizerName: profile.orgName,
                  organizerEmail: profile.orgEmail,
                  organizerPhone: profile.orgPhone,
                  organizerLink: profile.orgLink,
                  organizerAbout: profile.orgBio,
                })
              }
              className="rounded-lg border border-line px-3 py-2 text-xs font-bold text-amber transition-colors hover:border-gold/50 hover:text-gold focus-visible:focus-ring"
            >
              Use my profile details
            </button>
          </div>
          <div className="space-y-5">
            <Field
              label="Organizer or group name"
              icon={<User />}
              value={draft.organizerName ?? ""}
              onChange={(e) => patch({ organizerName: e.target.value })}
              placeholder="Lanka Beats Korea"
              autoComplete="organization"
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Contact email"
                type="email"
                icon={<Mail />}
                value={draft.organizerEmail ?? ""}
                onChange={(e) => patch({ organizerEmail: e.target.value })}
                placeholder="hello@yourgroup.kr"
                autoComplete="email"
              />
              <Field
                label="Contact phone"
                type="tel"
                icon={<Phone />}
                value={draft.organizerPhone ?? ""}
                onChange={(e) => patch({ organizerPhone: e.target.value })}
                placeholder="010-0000-0000"
                autoComplete="tel"
              />
            </div>
            <Field
              label="Website or social page (optional)"
              icon={<Globe />}
              value={draft.organizerLink ?? ""}
              onChange={(e) => patch({ organizerLink: e.target.value })}
              placeholder="instagram.com/yourgroup"
              autoComplete="url"
            />
            <div>
              <label htmlFor="organizer-about" className="mb-2 block text-xs font-bold text-muted">
                About the organizer (optional)
              </label>
              <textarea
                id="organizer-about"
                rows={3}
                maxLength={500}
                value={draft.organizerAbout ?? ""}
                onChange={(e) => patch({ organizerAbout: e.target.value })}
                placeholder="A line or two about your group and the events you run."
                className="w-full resize-none rounded-lg border border-line bg-surface p-4 text-sm leading-relaxed text-text placeholder:text-dim focus:border-gold focus:outline-none"
              />
              <p className="mt-1.5 text-right text-[11px] text-dim">{(draft.organizerAbout ?? "").length}/500</p>
            </div>
          </div>
        </Panel>

        <Panel className="p-5 sm:p-6">
          <h2 className="text-lg font-bold text-text">How will you sell tickets?</h2>
          <p className="mb-4 mt-1 text-[11px] text-dim">You can change this until the first ticket is sold.</p>
          <div role="radiogroup" aria-label="How tickets are sold" className="grid gap-4 sm:grid-cols-2">
            {[
              {
                id: "tickets" as const,
                title: "Ticket types",
                Icon: Tag,
                body: "General admission with tiers such as VVIP, VIP and General. Good for parks, halls and standing events.",
              },
              {
                id: "seats" as const,
                title: "Seat map",
                Icon: Armchair,
                optional: true,
                body: "Indoor auditorium or cinema with numbered seats. Buyers pick their own seat.",
              },
            ].map((o) => {
              const on = draft.sellMode === o.id;
              return (
                <label
                  key={o.id}
                  className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors ${
                    on ? "border-gold bg-gold/10" : "border-line hover:border-gold/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="sell-mode"
                    checked={on}
                    onChange={() => patch({ sellMode: o.id })}
                    className="mt-1 size-4 shrink-0 accent-[#e8a83a]"
                  />
                  <span className="leading-tight">
                    <span className="flex flex-wrap items-center gap-2 text-sm font-bold text-text">
                      <o.Icon size={15} aria-hidden className="text-gold" /> {o.title}
                      {o.optional && <Badge tone="warning">Optional</Badge>}
                    </span>
                    <span className="mt-2 block text-[11px] leading-relaxed text-muted">{o.body}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </Panel>
      </div>

      <div className="space-y-5">
        <Panel className="p-5">
          <h2 className="mb-4 text-lg font-bold text-text">Cover image</h2>
          <label
            htmlFor={fileId}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              accept(e.dataTransfer.files[0]);
            }}
            className={`relative flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
              dragging ? "border-gold bg-gold/10" : "border-amber/40 hover:border-gold/70"
            }`}
          >
            {draft.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- organizer-uploaded data URL
              <img src={draft.coverUrl} alt="Cover preview" className="absolute inset-0 size-full object-cover" />
            ) : (
              <>
                <ImageIcon size={22} aria-hidden className="text-gold" />
                <p className="text-[13px] font-bold text-text">Drop an image or browse</p>
                <p className="text-[11px] text-dim">JPG or PNG · 1600 × 800</p>
              </>
            )}
            <input
              ref={input}
              id={fileId}
              type="file"
              accept="image/jpeg,image/png"
              className="sr-only"
              onChange={(e) => accept(e.target.files?.[0])}
            />
          </label>
          {coverError && <p className="mt-2 text-xs text-danger">{coverError}</p>}
          {draft.coverName && <p className="mt-2 truncate text-[11px] text-dim">{draft.coverName}</p>}
        </Panel>

        <Panel className="p-5">
          <h2 className="mb-4 text-[13px] font-bold text-text">Before you publish</h2>
          <ul className="space-y-3">
            {checklist.map((c) => (
              <li key={c.label} className="flex items-center gap-3 text-xs">
                {c.done ? (
                  <CheckCircle2 size={14} aria-hidden className="text-success" />
                ) : (
                  <Clock size={14} aria-hidden className="text-dim" />
                )}
                <span className={c.done ? "text-text" : "text-muted"}>{c.label}</span>
                <span className="sr-only">{c.done ? "complete" : "not complete"}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <p className="flex items-start gap-3 rounded-xl border border-amber/40 bg-amber/10 p-4 text-xs leading-relaxed text-amber">
          <Info size={14} aria-hidden className="mt-0.5 shrink-0" />
          New events are reviewed by SL Events within one day before they go live.
        </p>
      </div>
    </div>
  );
}
