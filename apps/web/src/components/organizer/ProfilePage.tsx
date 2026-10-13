"use client";

import { useRef, useState } from "react";
import { BadgeCheck, Camera, Check, ChevronDown, Globe, KeyRound, Landmark, Mail, MapPin, Phone, Smartphone, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Toggle } from "@/components/ui/Toggle";
import { banks } from "@/lib/data";
import { fileToCoverDataUrl } from "@/lib/image";
import { maskAccount, profileInitials, type OrganizerNotificationKey, type OrganizerProfile } from "@/lib/profile";
import { OrgPageHeader, Panel } from "./ui";
import { useHydrated } from "./useHydrated";
import { useOrganizerProfile } from "./useOrganizerProfile";

const notificationRows: { key: OrganizerNotificationKey; label: string; hint: string }[] = [
  { key: "newBooking", label: "New bookings", hint: "When someone books tickets for one of your events." },
  { key: "paymentProof", label: "Payment proof uploaded", hint: "So you can check the transfer and approve it quickly." },
  { key: "refundRequest", label: "Refund and cancellation requests", hint: "When a buyer asks to cancel or get money back." },
  { key: "lowStock", label: "Tickets running low", hint: "When a ticket type is nearly sold out." },
  { key: "dailySummary", label: "Daily sales summary", hint: "One email each morning while an event is on sale." },
  { key: "platformNews", label: "News from SL Events", hint: "Product updates and organizer tips. Infrequent." },
];

const cities = ["Seoul", "Busan", "Incheon", "Daegu", "Ulsan", "Ansan", "Gimhae", "Other"];
const languages = ["English", "සිංහල (Sinhala)", "தமிழ் (Tamil)", "한국어 (Korean)"];

export function ProfilePage() {
  const hydrated = useHydrated();
  const { profile, saveProfile } = useOrganizerProfile();
  if (!hydrated) return <p className="text-sm text-muted">Loading profile…</p>;
  return <ProfileForm key="profile" initial={profile} onSave={saveProfile} />;
}

function ProfileForm({ initial, onSave }: { initial: OrganizerProfile; onSave: (p: OrganizerProfile) => void }) {
  const [form, setForm] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [logoError, setLogoError] = useState<string>();
  const [editingPayout, setEditingPayout] = useState(false);
  const [securityNote, setSecurityNote] = useState<string>();
  const [errors, setErrors] = useState<Partial<Record<"fullName" | "email" | "orgName" | "orgEmail" | "payout", string>>>({});
  const logoInput = useRef<HTMLInputElement>(null);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const set = (p: Partial<OrganizerProfile>) => {
    setForm((f) => ({ ...f, ...p }));
    setSaved(false);
  };

  async function pickLogo(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) return setLogoError("Use a JPG or PNG image.");
    if (file.size > 5 * 1024 * 1024) return setLogoError("That image is larger than 5 MB.");
    try {
      set({ logoUrl: await fileToCoverDataUrl(file, 320, 0.9, "image/png") });
      setLogoError(undefined);
    } catch {
      setLogoError("That image couldn't be read. Try a different file.");
    }
  }

  function save() {
    const e: typeof errors = {};
    if (!form.fullName.trim()) e.fullName = "Enter your name.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = "Enter a valid email address.";
    if (!form.orgName.trim()) e.orgName = "Your organization needs a name.";
    if (form.orgEmail.trim() && !/^\S+@\S+\.\S+$/.test(form.orgEmail.trim())) e.orgEmail = "Enter a valid email address.";
    if (!/^[\d\s-]{8,24}$/.test(form.payout.number.trim()) || !form.payout.holder.trim()) {
      e.payout = "Enter the account number and the name on the account.";
    }
    setErrors(e);
    if (Object.keys(e).length) {
      if (e.payout) setEditingPayout(true);
      return;
    }
    // TODO: PATCH the organizer profile; changes to the payout account are re-verified by SL Events first.
    onSave(form);
    setSaved(true);
    setEditingPayout(false);
  }

  const logoLetters = profileInitials({ fullName: form.orgName || form.fullName });

  return (
    <>
      <OrgPageHeader
        crumbs={[{ label: "Profile" }]}
        title="Organizer profile"
        actions={
          <>
            {dirty && (
              <Button
                variant="ghost"
                onClick={() => {
                  setForm(initial);
                  setErrors({});
                  setEditingPayout(false);
                }}
              >
                Discard changes
              </Button>
            )}
            <Button onClick={save} disabled={!dirty && !saved}>
              {saved && !dirty ? (
                <>
                  <Check size={16} aria-hidden /> Saved
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </>
        }
      />

      <div className="mx-auto max-w-5xl space-y-5">
        <Panel className="flex flex-wrap items-center gap-5 bg-gradient-to-r from-surface via-surface to-[#2a0d0d] p-5 sm:p-6">
          <div className="relative">
            <span className="flex size-24 items-center justify-center overflow-hidden rounded-2xl border-2 border-gold/60 bg-surface-2 text-3xl font-bold text-gold">
              {form.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- organizer-uploaded data URL
                <img src={form.logoUrl} alt={`${form.orgName} logo`} className="size-full object-cover" />
              ) : (
                logoLetters
              )}
            </span>
            <button
              type="button"
              aria-label="Change logo"
              onClick={() => logoInput.current?.click()}
              className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full bg-gradient-to-b from-gold to-amber text-ink focus-visible:focus-ring"
            >
              <Camera size={14} />
            </button>
            <input
              ref={logoInput}
              type="file"
              accept="image/jpeg,image/png"
              className="sr-only"
              aria-label="Upload a logo"
              onChange={(e) => pickLogo(e.target.files?.[0])}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-[26px] font-bold leading-tight text-text">{form.orgName || "Your organization"}</h2>
            <p className="mt-1.5 text-sm text-muted">
              {form.fullName} · {form.roleTitle}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-dim">
              {form.verified && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 font-bold text-success">
                  <BadgeCheck size={12} aria-hidden /> Verified organizer
                </span>
              )}
              <span>Member since {form.memberSince}</span>
            </div>
            {logoError && <p className="mt-2 text-xs text-danger">{logoError}</p>}
          </div>
          {form.logoUrl && (
            <Button variant="ghost" size="sm" onClick={() => set({ logoUrl: "" })}>
              Remove logo
            </Button>
          )}
        </Panel>

        <Panel className="p-5 sm:p-6">
          <h2 className="text-lg font-bold text-text">Your details</h2>
          <p className="mb-5 mt-1 text-[11px] text-dim">Only you and SL Events see these.</p>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name" icon={<User />} value={form.fullName} onChange={(e) => set({ fullName: e.target.value })} error={errors.fullName} autoComplete="name" />
            <Field label="Your role" value={form.roleTitle} onChange={(e) => set({ roleTitle: e.target.value })} placeholder="Founder, event lead…" />
            <Field label="Email" type="email" icon={<Mail />} value={form.email} onChange={(e) => set({ email: e.target.value })} error={errors.email} autoComplete="email" />
            <Field label="Mobile number" type="tel" icon={<Phone />} value={form.phone} onChange={(e) => set({ phone: e.target.value })} autoComplete="tel" />
            <div>
              <label htmlFor="org-language" className="mb-2 block text-xs font-bold text-muted">
                Language
              </label>
              <div className="relative">
                <select
                  id="org-language"
                  value={form.language}
                  onChange={(e) => set({ language: e.target.value })}
                  className="h-12 w-full cursor-pointer appearance-none rounded-lg border border-line bg-surface px-4 pr-10 text-sm text-text focus:border-gold focus:outline-none"
                >
                  {languages.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
                <ChevronDown size={14} aria-hidden className="pointer-events-none absolute right-4 top-4 text-muted" />
              </div>
            </div>
          </div>
        </Panel>

        <Panel className="p-5 sm:p-6">
          <h2 className="text-lg font-bold text-text">Organization</h2>
          <p className="mb-5 mt-1 text-[11px] text-dim">
            Shown to buyers as &ldquo;Hosted by&rdquo; on your events. You can fill these into a new event in one click.
          </p>
          <div className="space-y-5">
            <Field label="Organization or group name" value={form.orgName} onChange={(e) => set({ orgName: e.target.value })} error={errors.orgName} autoComplete="organization" />
            <div>
              <label htmlFor="org-bio" className="mb-2 block text-xs font-bold text-muted">
                About your organization
              </label>
              <textarea
                id="org-bio"
                rows={3}
                maxLength={500}
                value={form.orgBio}
                onChange={(e) => set({ orgBio: e.target.value })}
                className="w-full resize-none rounded-lg border border-line bg-surface p-4 text-sm leading-relaxed text-text placeholder:text-dim focus:border-gold focus:outline-none"
              />
              <p className="mt-1.5 text-right text-[11px] text-dim">{form.orgBio.length}/500</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Public contact email" type="email" icon={<Mail />} value={form.orgEmail} onChange={(e) => set({ orgEmail: e.target.value })} error={errors.orgEmail} />
              <Field label="Public contact phone" type="tel" icon={<Phone />} value={form.orgPhone} onChange={(e) => set({ orgPhone: e.target.value })} />
              <Field label="Website or social page" icon={<Globe />} value={form.orgLink} onChange={(e) => set({ orgLink: e.target.value })} placeholder="instagram.com/yourgroup" />
              <div>
                <label htmlFor="org-city" className="mb-2 block text-xs font-bold text-muted">
                  Based in
                </label>
                <div className="relative flex items-center">
                  <MapPin size={16} aria-hidden className="pointer-events-none absolute left-4 text-dim" />
                  <select
                    id="org-city"
                    value={form.city}
                    onChange={(e) => set({ city: e.target.value })}
                    className="h-12 w-full cursor-pointer appearance-none rounded-lg border border-line bg-surface pl-11 pr-10 text-sm text-text focus:border-gold focus:outline-none"
                  >
                    {cities.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} aria-hidden className="pointer-events-none absolute right-4 text-muted" />
                </div>
              </div>
            </div>
          </div>
        </Panel>

        <Panel className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-text">Payout account</h2>
              <p className="mt-1 text-[11px] text-dim">Where SL Events sends your ticket revenue after an event.</p>
            </div>
            {!editingPayout && (
              <Button variant="outline" size="sm" className="border-line text-text hover:bg-surface-2" onClick={() => setEditingPayout(true)}>
                Change account
              </Button>
            )}
          </div>

          {editingPayout ? (
            <div className="mt-5 space-y-5">
              <div className="grid gap-5 sm:grid-cols-3">
                <div>
                  <label htmlFor="payout-bank" className="mb-2 block text-xs font-bold text-muted">
                    Bank
                  </label>
                  <select
                    id="payout-bank"
                    value={form.payout.bank}
                    onChange={(e) => set({ payout: { ...form.payout, bank: e.target.value } })}
                    className="h-12 w-full rounded-lg border border-line bg-surface px-3 text-sm text-text focus:border-gold focus:outline-none"
                  >
                    {banks.map((b) => (
                      <option key={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <Field label="Account number" inputMode="numeric" value={form.payout.number} onChange={(e) => set({ payout: { ...form.payout, number: e.target.value } })} />
                <Field label="Name on the account" value={form.payout.holder} onChange={(e) => set({ payout: { ...form.payout, holder: e.target.value.toUpperCase() } })} />
              </div>
              {errors.payout && <p className="text-xs text-danger">{errors.payout}</p>}
              <p className="text-[11px] leading-relaxed text-dim">
                SL Events checks a new payout account before the next payout. Use an account in your own or your organization&apos;s name.
              </p>
            </div>
          ) : (
            <div className="mt-5 flex items-center gap-4 rounded-xl border border-line bg-surface-2 p-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold">
                <Landmark size={18} aria-hidden />
              </span>
              <div className="min-w-0 leading-tight">
                <p className="text-[13px] font-bold text-text">{form.payout.bank}</p>
                <p className="mt-1 font-mono text-xs text-muted">{maskAccount(form.payout.number)}</p>
                <p className="mt-1 text-[11px] text-dim">{form.payout.holder}</p>
              </div>
            </div>
          )}
        </Panel>

        <Panel className="p-5 sm:p-6">
          <h2 className="text-lg font-bold text-text">Notifications</h2>
          <p className="mb-4 mt-1 text-[11px] text-dim">Sent to {form.email || "your email"}.</p>
          <ul className="divide-y divide-line rounded-xl border border-line">
            {notificationRows.map((n) => (
              <li key={n.key} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0 leading-tight">
                  <p className="text-[13px] font-bold text-text">{n.label}</p>
                  <p className="mt-1 text-[11px] text-dim">{n.hint}</p>
                </div>
                <Toggle
                  label={n.label}
                  checked={form.notifications[n.key]}
                  onChange={(v) => set({ notifications: { ...form.notifications, [n.key]: v } })}
                />
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className="p-5 sm:p-6">
          <h2 className="text-lg font-bold text-text">Security</h2>
          <div className="mt-4 divide-y divide-line">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
              <div className="leading-tight">
                <p className="flex items-center gap-2 text-[13px] font-bold text-text">
                  <KeyRound size={14} aria-hidden className="text-gold" /> Password
                </p>
                <p className="mt-1 text-[11px] text-dim">Last changed 4 months ago</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-line text-text hover:bg-surface-2"
                // TODO: trigger the password-reset email through the auth API.
                onClick={() => setSecurityNote("We've emailed you a link to choose a new password.")}
              >
                Change password
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
              <div className="leading-tight">
                <p className="flex items-center gap-2 text-[13px] font-bold text-text">
                  <Smartphone size={14} aria-hidden className="text-gold" /> Logged-in devices
                </p>
                <p className="mt-1 text-[11px] text-dim">Chrome on Windows · Android phone</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-line text-text hover:bg-surface-2"
                onClick={() => setSecurityNote("Other devices have been logged out.")}
              >
                Log out other devices
              </Button>
            </div>
          </div>
          {securityNote && (
            <p role="status" className="mt-4 flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-xs text-text">
              <Check size={14} aria-hidden className="text-success" /> {securityNote}
            </p>
          )}
        </Panel>
      </div>
    </>
  );
}
