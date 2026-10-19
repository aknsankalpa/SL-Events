"use client";

import { Toggle } from "@/components/ui/Toggle";
import type { CustomerSettings } from "@/lib/customerSettings";
import { useCustomerSettings } from "./useCustomerSettings";

type Key = keyof CustomerSettings["notifications"];

/** How we reach you and what we send. Used on the notifications page and in profile settings. */
export function NotificationPreferences() {
  const { settings, update, user } = useCustomerSettings();
  const n = settings.notifications;

  const channels: { key: Key; label: string; hint: string }[] = [
    { key: "email", label: "Email", hint: user?.email ?? "" },
    { key: "browser", label: "Browser notifications", hint: "On this device" },
  ];
  const topics: { key: Key | "bookings"; label: string; hint: string; locked?: boolean }[] = [
    { key: "bookings", label: "Booking and payment updates", hint: "Always on for your bookings", locked: true },
    { key: "reminders", label: "Event reminders", hint: "The day before and 3 hours before" },
    { key: "city", label: "New events near me", hint: settings.city ? `In ${settings.city}` : "Set your city in your profile" },
    { key: "announcements", label: "Announcements from SL Events", hint: "Service news and changes" },
    { key: "offers", label: "Offers and promotions", hint: "" },
  ];

  const set = (key: Key, value: boolean) => update((s) => ({ ...s, notifications: { ...s.notifications, [key]: value } }));

  return (
    <div className="space-y-5">
      <Group title="Channels">
        {channels.map((c) => (
          <Row key={c.key} label={c.label} hint={c.hint} checked={n[c.key]} onChange={(v) => set(c.key, v)} />
        ))}
      </Group>
      <Group title="What to send">
        {topics.map((t) => (
          <Row
            key={t.key}
            label={t.label}
            hint={t.hint}
            checked={t.key === "bookings" ? true : n[t.key]}
            disabled={t.locked}
            onChange={(v) => t.key !== "bookings" && set(t.key, v)}
          />
        ))}
      </Group>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-dim">{title}</h3>
      <ul className="space-y-4">{children}</ul>
    </div>
  );
}

function Row({ label, hint, checked, disabled, onChange }: { label: string; hint: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <li className="flex items-center justify-between gap-4">
      <div className="min-w-0 leading-tight">
        <p className="text-[13px] font-bold text-text">{label}</p>
        {hint && <p className="mt-1 truncate text-[11px] text-dim">{hint}</p>}
      </div>
      <Toggle label={label} checked={checked} disabled={disabled} onChange={onChange} />
    </li>
  );
}
