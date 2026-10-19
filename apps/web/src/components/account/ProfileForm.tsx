"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BadgeCheck, Camera, Check, Download, Globe, LogOut, Lock, MapPin, Pencil, Phone, Trash2 } from "lucide-react";
import { useSession } from "@/components/auth/useSession";
import { useBookings } from "@/components/booking/useBookings";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Field, PasswordField, SelectField } from "@/components/ui/Field";
import { Badge } from "@/components/ui/StatusBadge";
import { Toggle } from "@/components/ui/Toggle";
import { cities } from "@/lib/data";
import { deleteAccount, signOut, updateProfile } from "@/lib/session";
import { formatKst } from "@/lib/bookings";
import { NotificationPreferences } from "./NotificationPreferences";
import { useCustomerSettings } from "./useCustomerSettings";

const languages = ["English", "සිංහල (Sinhala)", "தமிழ் (Tamil)", "한국어 (Korean)"];

/** Profile and settings: details, password, notifications, language, privacy, sign out. */
export function ProfileForm() {
  const router = useRouter();
  const { user } = useSession();
  const { bookings } = useBookings();
  const { settings, update } = useCustomerSettings();
  const photoInput = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [nameError, setNameError] = useState<string>();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [note, setNote] = useState<string>();

  useEffect(() => () => (photo ? URL.revokeObjectURL(photo) : undefined), [photo]);

  if (!user) return null;

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    if (!name) return setNameError("Enter your name.");
    setNameError(undefined);
    // TODO: PATCH the profile through the API.
    updateProfile({ name });
    update((s) => ({ ...s, phone: String(data.get("phone") ?? "").trim(), city: String(data.get("city") ?? "") }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function onPhoto(file?: File) {
    if (!file || !file.type.startsWith("image/")) return;
    setPhoto(URL.createObjectURL(file));
  }

  function downloadMyData() {
    // TODO: the API prepares this export; here it is built from what this browser holds.
    const data = { account: { name: user!.name, email: user!.email, verified: user!.verified }, settings, bookings };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-sl-events-data.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function logOut() {
    signOut();
    router.push("/");
  }

  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center justify-between gap-5 overflow-hidden bg-gradient-to-r from-surface via-surface to-[#2a0d0d] p-6">
        <div className="flex items-center gap-5">
          <div className="relative">
            <span className="flex size-[88px] items-center justify-center overflow-hidden rounded-full border-2 border-gold/60 bg-surface-2 text-3xl font-bold text-gold">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- local blob preview
                <img src={photo} alt="Your profile photo" className="size-full object-cover" />
              ) : (
                user.initials
              )}
            </span>
            <span aria-hidden className="absolute -bottom-0.5 -right-0.5 flex size-7 items-center justify-center rounded-full bg-gradient-to-b from-gold to-amber text-ink">
              <Camera size={13} />
            </span>
          </div>
          <div>
            <h1 className="font-display text-[28px] font-bold leading-tight text-text">{user.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="text-xs text-muted">{user.email}</span>
              {user.verified ? (
                <Badge tone="success" dot>
                  Email verified
                </Badge>
              ) : (
                <Link href={`/verify-email?email=${encodeURIComponent(user.email)}&next=/profile`} className="rounded-full">
                  <Badge tone="warning" dot>
                    Verify your email
                  </Badge>
                </Link>
              )}
            </div>
            <p className="mt-2 text-[11px] text-dim">
              {bookings.length} booking{bookings.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <Button variant="outline" className="border-line text-text hover:bg-surface-2" onClick={() => photoInput.current?.click()}>
          <Pencil size={14} aria-hidden /> Change photo
        </Button>
        <input ref={photoInput} type="file" accept="image/*" className="sr-only" aria-label="Upload a profile photo" onChange={(e) => onPhoto(e.target.files?.[0])} />
      </Card>

      <form key={user.name} onSubmit={onSave} noValidate>
        <Card className="p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-text">Personal information</h2>
            <div className="flex items-center gap-3">
              <span role="status" className="flex items-center gap-1.5 text-xs text-success">
                {saved && (
                  <>
                    <Check size={14} aria-hidden /> Saved
                  </>
                )}
              </span>
              <Button type="submit" size="sm">
                Save changes
              </Button>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Name" name="name" defaultValue={user.name} autoComplete="name" error={nameError} />
            <Field
              label="Email"
              name="email"
              type="email"
              value={user.email}
              readOnly
              hint="Your email identifies your account. To change it, contact support."
              trailing={user.verified ? <BadgeCheck size={16} aria-label="Verified" className="text-success" /> : undefined}
            />
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <Field label="Phone or messaging app (optional)" name="phone" defaultValue={settings.phone} icon={<Phone />} autoComplete="tel" />
            <SelectField label="City (optional)" name="city" defaultValue={settings.city} icon={<MapPin />}>
              <option value="">Not set</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </SelectField>
          </div>
        </Card>
      </form>

      <Card className="p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-text">Notifications</h2>
          <Link href="/notifications" className="text-xs font-bold text-amber hover:text-gold">
            Open your notifications
          </Link>
        </div>
        <NotificationPreferences />
      </Card>

      <Card className="p-6">
        <h2 className="mb-5 text-lg font-bold text-text">Language</h2>
        <SelectField label="Language" value={settings.language} onChange={(e) => update((s) => ({ ...s, language: e.target.value }))} icon={<Globe />}>
          {languages.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </SelectField>
        <p className="mt-2 text-[11px] text-dim">Your choice is saved. SL Events is shown in English for now; the other languages are coming.</p>
      </Card>

      <Card className="p-6">
        <h2 className="mb-5 text-lg font-bold text-text">Privacy</h2>
        <ul className="space-y-5">
          <li className="flex items-center justify-between gap-4">
            <div className="leading-tight">
              <p className="text-[13px] font-bold text-text">News and offers by email</p>
              <p className="mt-1 text-[11px] text-dim">Marketing messages. Booking emails are always sent.</p>
            </div>
            <Toggle label="News and offers by email" checked={settings.privacy.marketing} onChange={(v) => update((s) => ({ ...s, privacy: { ...s.privacy, marketing: v } }))} />
          </li>
          <li className="flex items-center justify-between gap-4">
            <div className="leading-tight">
              <p className="text-[13px] font-bold text-text">Help improve SL Events</p>
              <p className="mt-1 text-[11px] text-dim">Share anonymous usage data. Never your name or payments.</p>
            </div>
            <Toggle label="Help improve SL Events" checked={settings.privacy.analytics} onChange={(v) => update((s) => ({ ...s, privacy: { ...s.privacy, analytics: v } }))} />
          </li>
        </ul>
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
          <Button variant="outline" size="sm" className="border-line text-text hover:bg-surface-2" onClick={downloadMyData}>
            <Download size={14} aria-hidden /> Download my data
          </Button>
          <Link href="/privacy" className="text-xs font-bold text-amber hover:text-gold">
            Read the privacy policy
          </Link>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-5 text-lg font-bold text-text">Security</h2>
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
          <div>
            <p className="text-[13px] font-bold text-text">Password</p>
            <p className="mt-1 text-[11px] text-dim">
              {settings.passwordChangedAt ? `Last changed ${formatKst(settings.passwordChangedAt)}` : "Choose a strong password you don't use elsewhere"}
            </p>
          </div>
          <Button variant="outline" size="sm" className="border-line text-text hover:bg-surface-2" onClick={() => setPasswordOpen(true)}>
            <Lock size={14} aria-hidden /> Change password
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 pt-5">
          <div>
            <p className="text-[13px] font-bold text-text">Logged-in devices</p>
            <p className="mt-1 text-[11px] text-dim">This browser is signed in.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-line text-text hover:bg-surface-2"
            // TODO: ask the auth API to end every other session.
            onClick={() => setNote("Other devices have been logged out.")}
          >
            Log out other devices
          </Button>
        </div>
        {note && (
          <p role="status" className="mt-4 text-xs text-success">
            {note}
          </p>
        )}
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-surface p-6">
        <div>
          <p className="text-[13px] font-bold text-text">Sign out</p>
          <p className="mt-1 text-[11px] text-dim">You can log back in any time with your email and password.</p>
        </div>
        <Button variant="outline" size="sm" className="border-line text-text hover:bg-surface-2" onClick={logOut}>
          <LogOut size={14} aria-hidden /> Sign out
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-danger/30 bg-danger/5 p-6">
        <div>
          <p className="text-[13px] font-bold text-danger">Delete account</p>
          <p className="mt-1 max-w-md text-[11px] leading-relaxed text-dim">
            Your account and preferences will be removed. Payment records are kept for 5 years as the law requires.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)} className="border-danger/50 text-danger hover:bg-danger/10">
          <Trash2 size={14} aria-hidden /> Delete account
        </Button>
      </div>

      <PasswordDialog
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        onChanged={() => {
          update((s) => ({ ...s, passwordChangedAt: new Date().toISOString() }));
          setPasswordOpen(false);
          setNote("Your password was changed.");
        }}
      />

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete your account?">
        <p className="text-sm leading-relaxed text-muted">
          This removes your account. You won&apos;t be able to open your tickets afterwards. This can&apos;t be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
            Keep my account
          </Button>
          <Button
            variant="danger"
            // TODO: call the delete-account API.
            onClick={() => {
              deleteAccount(user.email);
              router.push("/");
            }}
          >
            Delete account
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function PasswordDialog({ open, onClose, onChanged }: { open: boolean; onClose: () => void; onChanged: () => void }) {
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const current = String(data.get("current") ?? "");
    const next = String(data.get("next") ?? "");
    const found: typeof errors = {};
    if (!current) found.current = "Enter your current password.";
    if (next.length < 8) found.next = "Use at least 8 characters.";
    else if (next === current) found.next = "Choose a password that is different from the current one.";
    if (data.get("confirm") !== next) found.confirm = "Passwords do not match.";
    setErrors(found);
    if (Object.keys(found).length) return;
    // TODO: send the current and new password to the auth API, which checks the current one.
    e.currentTarget.reset();
    onChanged();
  }

  return (
    <Dialog open={open} onClose={onClose} title="Change password">
      <form onSubmit={submit} noValidate className="space-y-4">
        <PasswordField label="Current password" name="current" autoComplete="current-password" error={errors.current} />
        <PasswordField label="New password" name="next" autoComplete="new-password" hint="At least 8 characters." error={errors.next} />
        <PasswordField label="Confirm new password" name="confirm" autoComplete="new-password" error={errors.confirm} />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Update password</Button>
        </div>
      </form>
    </Dialog>
  );
}
