"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Eye, ImageUp, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { type PlatformSettings } from "@/lib/admin";
import { logAudit, updateConfig } from "@/lib/adminStore";
import { formatKrw } from "@/lib/format";
import { AdminHeader, Panel, Toast } from "./ui";
import { useAdminConfig } from "./useAdmin";

type Section = "branding" | "categories" | "tickets" | "fees" | "limits" | "cancellations" | "payments" | "languages";

const sections: { id: Section; label: string; keys: (keyof PlatformSettings)[] }[] = [
  { id: "branding", label: "Branding", keys: ["logo", "name", "tagline", "email", "website", "colours"] },
  { id: "categories", label: "Event categories", keys: ["categories"] },
  { id: "tickets", label: "Ticket types", keys: ["ticketTypes"] },
  { id: "fees", label: "Fees", keys: ["feePercent", "feeFixed", "feePays"] },
  { id: "limits", label: "Booking limits", keys: ["maxTickets", "seatHold", "transferDeadline"] },
  { id: "cancellations", label: "Cancellations", keys: ["cancelUntil", "notifyOnCancel"] },
  { id: "payments", label: "Payment accounts", keys: ["accountBank", "accountNumber", "accountHolder"] },
  { id: "languages", label: "Languages", keys: ["languages"] },
];

const names: Partial<Record<keyof PlatformSettings, string>> = {
  logo: "Logo",
  name: "Website name",
  tagline: "Tagline",
  email: "Support email",
  website: "Website",
  colours: "Brand colours",
  categories: "Event categories",
  ticketTypes: "Ticket types",
  feePercent: "Platform fee (%)",
  feeFixed: "Fee per ticket",
  feePays: "Fee paid by",
  maxTickets: "Most tickets per booking",
  seatHold: "Seat hold time",
  transferDeadline: "Bank transfer deadline",
  cancelUntil: "Organizers can cancel until",
  notifyOnCancel: "Tell buyers when an event is cancelled",
  accountBank: "Bank",
  accountNumber: "Account number",
  accountHolder: "Account holder",
  languages: "Languages",
};

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const show = (v: unknown): string => (Array.isArray(v) ? v.join(", ") : typeof v === "boolean" ? (v ? "On" : "Off") : typeof v === "object" && v ? Object.entries(v).filter(([, on]) => on).map(([k]) => k).join(", ") : v === "" ? "Default" : String(v));
const selectClass = "h-12 w-full rounded-lg border border-line bg-surface px-4 text-sm text-text focus:border-gold focus:outline-none";
const MAX_LOGO = 300 * 1024;

/** Platform configuration. Edits are a draft until "Save and publish"; each saved group is written to the audit log with before and after. */
export function SettingsPage() {
  const config = useAdminConfig();
  const [section, setSection] = useState<Section>("branding");
  const [draft, setDraft] = useState<PlatformSettings | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string>();
  const fileRef = useRef<HTMLInputElement>(null);

  const saved = config.settings;
  const s = draft ?? saved;
  const set = (patch: Partial<PlatformSettings>) => setDraft({ ...s, ...patch });

  const changedKeys = (Object.keys(saved) as (keyof PlatformSettings)[]).filter((k) => !same(saved[k], s[k]));

  const say = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(undefined), 3200);
  };

  function validate() {
    const e: Record<string, string> = {};
    if (!s.name.trim()) e.name = "Enter the website name.";
    if (!/^\S+@\S+\.\S+$/.test(s.email)) e.email = "Enter a valid email address.";
    if (s.colours.some((c) => !/^#[0-9a-f]{6}$/i.test(c))) e.colours = "Colours look like #f7cb60.";
    if (!(s.feePercent >= 0 && s.feePercent <= 30)) e.feePercent = "Enter a number from 0 to 30.";
    if (!(s.feeFixed >= 0 && s.feeFixed <= 5000)) e.feeFixed = "Enter an amount from ₩0 to ₩5,000.";
    if (!(Number.isInteger(s.maxTickets) && s.maxTickets >= 1 && s.maxTickets <= 20)) e.maxTickets = "Enter a whole number from 1 to 20.";
    if (!s.accountNumber.trim()) e.accountNumber = "Enter the account number.";
    if (!s.accountHolder.trim()) e.accountHolder = "Enter the account holder.";
    if (s.categories.length === 0) e.categories = "Keep at least one category.";
    return e;
  }

  function save() {
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) {
      const first = sections.find((sec) => sec.keys.some((k) => Object.keys(found).includes(k)));
      if (first) setSection(first.id);
      return;
    }
    // TODO: the API validates every value again and applies the change to the live website.
    updateConfig((c) => ({ ...c, settings: s }));
    for (const sec of sections) {
      const keys = changedKeys.filter((k) => sec.keys.includes(k));
      if (!keys.length) continue;
      logAudit({
        type: "settings",
        action: `Changed ${sec.label.toLowerCase()}`,
        item: `settings: ${sec.id}`,
        detail: { changes: keys.map((k) => ({ label: names[k] ?? k, from: show(saved[k]), to: show(s[k]) })) },
      });
    }
    setDraft(null);
    say("Saved and published.");
  }

  function onLogo(file?: File) {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) return setErrors({ logo: "Use a PNG, JPG, WebP or SVG image." });
    if (file.size > MAX_LOGO) return setErrors({ logo: "That image is over 300 KB. Use a smaller one." });
    const reader = new FileReader();
    reader.onload = () => {
      setErrors({});
      set({ logo: String(reader.result) });
    };
    reader.readAsDataURL(file);
  }

  const price = 30_000;
  const fee = Math.round((price * s.feePercent) / 100) + s.feeFixed;

  const heading = (title: string, note?: string) => (
    <div className="mb-5">
      <h2 className="text-base font-bold text-text">{title}</h2>
      {note && <p className="mt-1 text-xs text-dim">{note}</p>}
    </div>
  );

  const sectionView: Record<Section, React.ReactNode> = {
    branding: (
      <>
        {heading("Branding", "How the website looks to customers.")}
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex size-16 items-center justify-center overflow-hidden rounded-xl border border-line bg-surface-2 text-lg font-bold text-gold">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {s.logo ? <img src={s.logo} alt="Current logo" className="size-full object-contain" /> : "SL"}
          </span>
          <div className="flex flex-wrap gap-2">
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" aria-label="Choose a logo" onChange={(e) => onLogo(e.target.files?.[0])} />
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
              <ImageUp size={14} aria-hidden /> Replace logo
            </Button>
            <Button size="sm" variant="ghost" disabled={!s.logo} onClick={() => set({ logo: "" })}>
              Remove
            </Button>
          </div>
          {errors.logo && <p role="alert" className="w-full text-xs text-danger">{errors.logo}</p>}
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Website name" value={s.name} error={errors.name} onChange={(e) => set({ name: e.target.value })} />
          <Field label="Website" value={s.website} onChange={(e) => set({ website: e.target.value })} />
          <Field className="sm:col-span-2" label="Tagline" value={s.tagline} onChange={(e) => set({ tagline: e.target.value })} />
          <Field className="sm:col-span-2" label="Support email" type="email" value={s.email} error={errors.email} onChange={(e) => set({ email: e.target.value })} />
        </div>
        <p className="mb-2 mt-6 text-xs font-bold text-muted">Brand colours</p>
        <div className="flex flex-wrap items-center gap-3">
          {s.colours.map((c, i) => (
            <span key={i} className="flex items-center gap-2 rounded-lg border border-line bg-surface px-2 py-1.5">
              <span aria-hidden className="size-6 shrink-0 rounded-md border border-line" style={{ background: /^#[0-9a-f]{6}$/i.test(c) ? c : "transparent" }} />
              <input
                aria-label={`Colour ${i + 1}`}
                value={c}
                maxLength={7}
                onChange={(e) => set({ colours: s.colours.map((x, j) => (j === i ? e.target.value : x)) })}
                className="w-20 bg-transparent font-mono text-xs text-text focus:outline-none"
              />
              {s.colours.length > 1 && (
                <button type="button" aria-label={`Remove colour ${i + 1}`} onClick={() => set({ colours: s.colours.filter((_, j) => j !== i) })} className="text-dim hover:text-danger">
                  <X size={13} />
                </button>
              )}
            </span>
          ))}
          {s.colours.length < 5 && (
            <Button size="sm" variant="ghost" onClick={() => set({ colours: [...s.colours, "#ffffff"] })}>
              <Plus size={14} aria-hidden /> Add colour
            </Button>
          )}
        </div>
        {errors.colours && <p role="alert" className="mt-2 text-xs text-danger">{errors.colours}</p>}
      </>
    ),

    categories: (
      <>
        {heading("Event categories", "Organizers choose one of these for each event. Use the arrows to change the order shown on the website.")}
        <ul className="flex flex-wrap gap-2">
          {s.categories.map((c, i) => (
            <li key={c} className="flex items-center gap-1 rounded-full border border-line bg-surface-2 py-1 pl-1.5 pr-2 text-[13px] text-text">
              <button type="button" aria-label={`Move ${c} earlier`} disabled={i === 0} onClick={() => set({ categories: move(s.categories, i, -1) })} className="rounded p-1 text-dim hover:text-gold disabled:opacity-30">
                <ArrowLeft size={12} />
              </button>
              {c}
              <button type="button" aria-label={`Move ${c} later`} disabled={i === s.categories.length - 1} onClick={() => set({ categories: move(s.categories, i, 1) })} className="rounded p-1 text-dim hover:text-gold disabled:opacity-30">
                <ArrowRight size={12} />
              </button>
              <button type="button" aria-label={`Remove ${c}`} onClick={() => set({ categories: s.categories.filter((x) => x !== c) })} className="rounded p-1 text-dim hover:text-danger">
                <X size={13} />
              </button>
            </li>
          ))}
        </ul>
        {errors.categories && <p role="alert" className="mt-2 text-xs text-danger">{errors.categories}</p>}
        <form
          className="mt-5 flex max-w-md gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const name = newCategory.trim();
            if (!name || s.categories.some((c) => c.toLowerCase() === name.toLowerCase())) return;
            set({ categories: [...s.categories, name] });
            setNewCategory("");
          }}
        >
          <Field className="min-w-0 flex-1" label="New category" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
          <Button type="submit" size="lg" variant="outline" className="mt-[26px]">
            Add
          </Button>
        </form>
        <p className="mt-3 text-[11px] text-dim">Removing a category doesn&apos;t change events that already use it.</p>
      </>
    ),

    tickets: (
      <>
        {heading("Ticket types", "Which kinds of ticket organizers can sell.")}
        <ul className="divide-y divide-line rounded-xl border border-line">
          {Object.entries(s.ticketTypes).map(([name, on]) => (
            <li key={name} className="flex items-center justify-between gap-4 px-4 py-3.5">
              <span className="text-sm text-text">{name}</span>
              <Toggle label={name} checked={on} onChange={(v) => set({ ticketTypes: { ...s.ticketTypes, [name]: v } })} />
            </li>
          ))}
        </ul>
      </>
    ),

    fees: (
      <>
        {heading("Fees", "What SL Events earns on every paid ticket. Changes apply to new bookings only.")}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Percentage of the ticket price" type="number" min={0} max={30} step={0.5} value={s.feePercent} error={errors.feePercent} onChange={(e) => set({ feePercent: Number(e.target.value) })} />
          <Field label="Extra fee per ticket (₩)" type="number" min={0} max={5000} step={100} value={s.feeFixed} error={errors.feeFixed} onChange={(e) => set({ feeFixed: Number(e.target.value) })} />
          <div className="sm:col-span-2">
            <label htmlFor="fee-pays" className="mb-2 block text-xs font-bold text-muted">
              Who pays the fee
            </label>
            <Select id="fee-pays" value={s.feePays} onChange={(e) => set({ feePays: e.target.value as PlatformSettings["feePays"] })} className={selectClass}>
              <option value="Organizer">The organizer (taken from their payout)</option>
              <option value="Buyer">The buyer (added at checkout)</option>
            </Select>
          </div>
        </div>
        <p className="mt-5 rounded-lg border border-gold/30 bg-gold/10 p-4 text-[13px] leading-relaxed text-text">
          Example: a {formatKrw(price)} ticket carries a fee of <strong>{formatKrw(fee)}</strong> ({s.feePercent}% + {formatKrw(s.feeFixed)}).{" "}
          {s.feePays === "Organizer" ? `The buyer pays ${formatKrw(price)} and the organizer receives ${formatKrw(price - fee)}.` : `The buyer pays ${formatKrw(price + fee)} and the organizer receives ${formatKrw(price)}.`}
        </p>
      </>
    ),

    limits: (
      <>
        {heading("Booking limits", "How much one customer can book and how long they have to pay.")}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field className="sm:col-span-2" label="Most tickets in one booking" type="number" min={1} max={20} value={s.maxTickets} error={errors.maxTickets} onChange={(e) => set({ maxTickets: Number(e.target.value) })} />
          <div>
            <label htmlFor="seat-hold" className="mb-2 block text-xs font-bold text-muted">
              Seat hold time
            </label>
            <Select id="seat-hold" value={s.seatHold} onChange={(e) => set({ seatHold: e.target.value })} className={selectClass}>
              {["30 minutes", "1 hour", "12 hours", "24 hours", "48 hours"].map((o) => (
                <option key={o}>{o}</option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="transfer-deadline" className="mb-2 block text-xs font-bold text-muted">
              Bank transfer deadline
            </label>
            <Select id="transfer-deadline" value={s.transferDeadline} onChange={(e) => set({ transferDeadline: e.target.value })} className={selectClass}>
              {["12 hours after booking", "24 hours after booking", "48 hours after booking"].map((o) => (
                <option key={o}>{o}</option>
              ))}
            </Select>
          </div>
        </div>
      </>
    ),

    cancellations: (
      <>
        {heading("Cancellations", "Rules for organizers who cancel an event.")}
        <label htmlFor="cancel-until" className="mb-2 block text-xs font-bold text-muted">
          Organizers can cancel until
        </label>
        <Select id="cancel-until" value={s.cancelUntil} onChange={(e) => set({ cancelUntil: e.target.value })} className={`${selectClass} max-w-md`}>
          {["24 hours before the event", "3 days before the event", "7 days before the event", "Any time before the event"].map((o) => (
            <option key={o}>{o}</option>
          ))}
        </Select>
        <div className="mt-6 flex max-w-md items-center justify-between gap-4 rounded-xl border border-line p-4">
          <div>
            <p className="text-sm font-bold text-text">Tell buyers when an event is cancelled</p>
            <p className="mt-1 text-[11px] text-dim">An email and a notification go to everyone who booked.</p>
          </div>
          <Toggle label="Tell buyers when an event is cancelled" checked={s.notifyOnCancel} onChange={(v) => set({ notifyOnCancel: v })} />
        </div>
      </>
    ),

    payments: (
      <>
        {heading("Payment accounts", "The bank account customers are told to transfer to. Changing it affects new bookings straight away.")}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field className="sm:col-span-2" label="Bank" value={s.accountBank} onChange={(e) => set({ accountBank: e.target.value })} />
          <Field label="Account number" value={s.accountNumber} error={errors.accountNumber} onChange={(e) => set({ accountNumber: e.target.value })} />
          <Field label="Account holder" value={s.accountHolder} error={errors.accountHolder} onChange={(e) => set({ accountHolder: e.target.value })} />
        </div>
        <p className="mt-4 text-[11px] text-dim">Bookings already made keep the account they were shown.</p>
      </>
    ),

    languages: (
      <>
        {heading("Languages", "Which languages customers can choose. English is always on.")}
        <ul className="divide-y divide-line rounded-xl border border-line">
          {Object.entries(s.languages).map(([name, on]) => (
            <li key={name} className="flex items-center justify-between gap-4 px-4 py-3.5">
              <span className="text-sm text-text">{name}</span>
              <Toggle label={name} checked={on} disabled={name === "English"} onChange={(v) => set({ languages: { ...s.languages, [name]: v } })} />
            </li>
          ))}
        </ul>
      </>
    ),
  };

  const count = changedKeys.length;

  return (
    <>
      <AdminHeader
        section="Settings"
        title="Platform configuration"
        actions={
          <Link href="/" target="_blank" className="inline-flex h-11 items-center gap-2 rounded-lg border border-gold/60 px-5 text-sm font-bold text-gold hover:bg-gold/10">
            <Eye size={16} aria-hidden /> Preview website
          </Link>
        }
      />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="min-w-0">
          <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {sections.map((sec) => {
              const active = sec.id === section;
              const edits = changedKeys.filter((k) => sec.keys.includes(k)).length;
              return (
                <li key={sec.id} className="shrink-0 lg:shrink">
                  <button
                    type="button"
                    onClick={() => setSection(sec.id)}
                    aria-current={active ? "page" : undefined}
                    className={`flex w-full items-center justify-between gap-3 whitespace-nowrap rounded-xl px-4 py-2.5 text-left text-[13px] font-bold transition-colors focus-visible:focus-ring ${active ? "bg-gold/10 text-gold ring-1 ring-gold/50" : "text-muted hover:bg-surface-2 hover:text-text"}`}
                  >
                    {sec.label}
                    {edits > 0 && <span aria-label={`${edits} unsaved`} className="size-2 rounded-full bg-amber" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <Panel className="min-w-0 p-5 sm:p-6" aria-label={sections.find((x) => x.id === section)!.label}>
          {sectionView[section]}
        </Panel>
      </div>

      {count > 0 && (
        <div role="region" aria-label="Unsaved changes" className="sticky bottom-4 z-30 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold/40 bg-surface px-5 py-3 shadow-2xl shadow-black/60">
          <p className="text-[13px] font-bold text-text">
            {count} unsaved {count === 1 ? "change" : "changes"}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setDraft(null);
                setErrors({});
              }}
              className="text-[13px] text-muted hover:text-text"
            >
              Discard
            </button>
            <Button onClick={save}>Save and publish</Button>
          </div>
        </div>
      )}
      <Toast message={toast} />
    </>
  );
}

function move<T>(list: T[], from: number, step: 1 | -1): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(from + step, 0, item!);
  return next;
}
