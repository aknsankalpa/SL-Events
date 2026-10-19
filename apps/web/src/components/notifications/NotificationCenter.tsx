"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertCircle, BellOff, CalendarClock, Check, CheckCircle2, Clock, Hourglass, Loader2, Megaphone, Receipt, Sparkles, type LucideIcon } from "lucide-react";
import { NotificationPreferences } from "@/components/account/NotificationPreferences";
import type { Notification } from "@/lib/notifications";
import { useNotifications, type NotificationView } from "./useNotifications";

const icons: Record<Notification["icon"], LucideIcon> = {
  check: CheckCircle2,
  alert: AlertCircle,
  hourglass: Hourglass,
  clock: Clock,
  calendar: CalendarClock,
  sparkles: Sparkles,
  receipt: Receipt,
  megaphone: Megaphone,
};

const tones: Record<Notification["tone"], string> = {
  success: "bg-success/15 text-success",
  danger: "bg-danger/15 text-danger",
  warning: "bg-amber/15 text-amber",
  neutral: "bg-white/5 text-muted",
};

const tabs = [
  { id: "all", label: "All", match: () => true },
  { id: "unread", label: "Unread", match: (n: NotificationView) => n.unread },
  { id: "bookings", label: "Bookings", match: (n: NotificationView) => n.kind === "booking" },
  { id: "events", label: "Events", match: (n: NotificationView) => n.kind === "event" },
  { id: "announcements", label: "Announcements", match: (n: NotificationView) => n.kind === "announcement" },
] as const;

type TabId = (typeof tabs)[number]["id"];

/** Booking updates, event news and announcements, with the settings that control them. */
export function NotificationCenter() {
  const { items, unread, ready, markRead, markAllRead } = useNotifications();
  const [tab, setTab] = useState<TabId>("all");

  const visible = items.filter(tabs.find((t) => t.id === tab)!.match);
  const groups = [
    { name: "Needs your attention", list: visible.filter((n) => n.attention) },
    { name: "Updates", list: visible.filter((n) => !n.attention) },
  ].filter((g) => g.list.length > 0);

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

        <div role="tablist" aria-label="Filter notifications" className="mt-6 flex gap-6 overflow-x-auto border-b border-line">
          {tabs.map((t) => {
            const count = items.filter(t.match).length;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 pb-3 text-[13px] font-bold transition-colors focus-visible:focus-ring ${
                  active ? "border-amber text-gold" : "border-transparent text-muted hover:text-text"
                }`}
              >
                {t.label}
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted">{count}</span>
              </button>
            );
          })}
        </div>

        {!ready && (
          <p role="status" className="mt-8 flex items-center justify-center gap-3 text-sm text-muted">
            <Loader2 size={16} aria-hidden className="animate-spin text-gold" /> Loading…
          </p>
        )}

        {ready &&
          groups.map((g) => (
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
                        <div className="mt-2 flex flex-wrap items-center gap-4">
                          {n.action && (
                            <Link href={n.action.href} onClick={() => markRead(n.id)} className="text-xs font-bold text-amber hover:text-gold">
                              {n.action.label}
                            </Link>
                          )}
                          {n.unread && (
                            <button type="button" onClick={() => markRead(n.id)} className="text-[11px] text-dim hover:text-text">
                              Mark as read
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

        {ready && groups.length === 0 && (
          <div className="mt-8 rounded-xl border border-line bg-surface p-10 text-center">
            <BellOff size={26} aria-hidden className="mx-auto text-dim" />
            <p className="mt-3 text-sm font-bold text-text">{tab === "unread" ? "You're all caught up" : "Nothing here yet"}</p>
            <p className="mt-1 text-xs text-muted">Updates about your bookings, events and SL Events will show up here.</p>
          </div>
        )}
      </div>

      <aside className="rounded-xl border border-line bg-surface p-6 lg:sticky lg:top-[108px]">
        <h2 className="text-lg font-bold text-text">Notification settings</h2>
        <p className="mb-5 mt-1 text-[11px] text-dim">Choose how we reach you.</p>
        <NotificationPreferences />
      </aside>
    </div>
  );
}
