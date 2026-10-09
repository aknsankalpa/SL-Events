"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertCircle, CalendarClock, CheckCircle2, Check, Clock, Hourglass, Receipt, Sparkles, type LucideIcon } from "lucide-react";
import { Toggle } from "@/components/ui/Toggle";
import { channelSettings, notifications as initial, topicSettings, type NotificationItem, type NotificationSetting } from "@/lib/content";

const icons: Record<NotificationItem["icon"], LucideIcon> = {
  check: CheckCircle2,
  alert: AlertCircle,
  hourglass: Hourglass,
  clock: Clock,
  calendar: CalendarClock,
  sparkles: Sparkles,
  receipt: Receipt,
};

const tones: Record<NotificationItem["tone"], string> = {
  success: "bg-success/15 text-success",
  danger: "bg-danger/15 text-danger",
  warning: "bg-amber/15 text-amber",
  neutral: "bg-white/5 text-muted",
};

const tabs = [
  { id: "all", label: "All", match: () => true },
  { id: "unread", label: "Unread", match: (n: NotificationItem) => !!n.unread },
  { id: "bookings", label: "Bookings", match: (n: NotificationItem) => n.kind === "booking" },
  { id: "events", label: "Events", match: (n: NotificationItem) => n.kind === "event" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function NotificationCenter() {
  const [items, setItems] = useState(initial);
  const [tab, setTab] = useState<TabId>("all");
  const [settings, setSettings] = useState<Record<string, boolean>>(() =>
    Object.fromEntries([...channelSettings, ...topicSettings].map((s) => [s.id, s.on])),
  );

  const unread = items.filter((n) => n.unread).length;
  const visible = items.filter(tabs.find((t) => t.id === tab)!.match);
  const groups = (["Today", "This week"] as const)
    .map((g) => ({ name: g, list: visible.filter((n) => n.group === g) }))
    .filter((g) => g.list.length > 0);

  const markRead = (id: string) => setItems((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
  const markAllRead = () => setItems((prev) => prev.map((n) => ({ ...n, unread: false })));

  return (
    <div className="mx-auto grid max-w-site items-start gap-8 px-5 py-10 lg:grid-cols-[1fr_21rem]">
      <div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-[34px] font-bold leading-tight text-text">Notifications</h1>
            <p className="mt-2 text-xs text-muted" aria-live="polite">
              {unread} unread
            </p>
          </div>
          <button
            type="button"
            onClick={markAllRead}
            disabled={unread === 0}
            className="flex items-center gap-2 text-xs font-bold text-amber hover:text-gold disabled:opacity-40"
          >
            <Check size={14} aria-hidden /> Mark all as read
          </button>
        </div>

        <div role="tablist" aria-label="Filter notifications" className="mt-6 flex gap-6 border-b border-line">
          {tabs.map((t) => {
            const count = items.filter(t.match).length;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={`-mb-px flex items-center gap-2 border-b-2 pb-3 text-[13px] font-bold transition-colors focus-visible:focus-ring ${
                  active ? "border-amber text-gold" : "border-transparent text-muted hover:text-text"
                }`}
              >
                {t.label}
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted">{count}</span>
              </button>
            );
          })}
        </div>

        {groups.map((g) => (
          <section key={g.name} aria-label={g.name} className="mt-6">
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-dim">{g.name}</h2>
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
              {g.list.map((n) => {
                const Icon = icons[n.icon];
                return (
                  <li key={n.id} className={`flex gap-4 p-5 ${n.unread ? "bg-surface-2/60" : ""}`}>
                    <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${tones[n.tone]}`}>
                      <Icon size={18} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-[13px] font-bold text-text">{n.title}</h3>
                        <span className="flex shrink-0 items-center gap-2 text-[11px] text-dim">
                          {n.time}
                          {n.unread && <span aria-label="Unread" className="size-2 rounded-full bg-amber" />}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted">{n.body}</p>
                      {n.action && (
                        <Link
                          href={n.action.href}
                          onClick={() => markRead(n.id)}
                          className="mt-2 inline-block text-xs font-bold text-amber hover:text-gold"
                        >
                          {n.action.label}
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        {groups.length === 0 && (
          <p className="mt-8 rounded-xl border border-line bg-surface p-10 text-center text-sm text-muted">You&apos;re all caught up.</p>
        )}
      </div>

      <aside className="rounded-xl border border-line bg-surface p-6 lg:sticky lg:top-[108px]">
        <h2 className="text-lg font-bold text-text">Notification settings</h2>
        <p className="mt-1 text-[11px] text-dim">Choose how we reach you.</p>
        <SettingGroup title="Channels" items={channelSettings} state={settings} onChange={setSettings} />
        <div className="my-5 border-t border-line" />
        <SettingGroup title="What to send" items={topicSettings} state={settings} onChange={setSettings} />
      </aside>
    </div>
  );
}

function SettingGroup({
  title,
  items,
  state,
  onChange,
}: {
  title: string;
  items: NotificationSetting[];
  state: Record<string, boolean>;
  onChange: (next: Record<string, boolean>) => void;
}) {
  return (
    <div className="mt-5">
      <h3 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-dim">{title}</h3>
      <ul className="space-y-4">
        {items.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-4">
            <div className="leading-tight">
              <p className="text-[13px] font-bold text-text">{s.label}</p>
              {s.hint && <p className="mt-1 text-[11px] text-dim">{s.hint}</p>}
            </div>
            <Toggle label={s.label} checked={state[s.id] ?? false} disabled={s.locked} onChange={(v) => onChange({ ...state, [s.id]: v })} />
          </li>
        ))}
      </ul>
    </div>
  );
}
