"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import type { OrganizerEvent } from "@/lib/organizer";
import { EventPerformance } from "./EventPerformance";
import { RecentOrders } from "./RecentOrders";
import { TicketMix } from "./TicketMix";

const tabs = [
  { id: "orders", label: "Recent orders", hint: "Latest bookings across your events", href: "/organizer/bookings", link: "View all" },
  { id: "events", label: "Event performance", hint: "Sales and payments to check, per event", href: "/organizer/events", link: "All events" },
  { id: "mix", label: "Ticket mix", hint: "Share of tickets sold by type" },
] as const;

type TabId = (typeof tabs)[number]["id"];

/**
 * One panel for the three detail views, so the dashboard fits a single screen on desktop. The body scrolls inside
 * the panel (with a sticky table header) instead of the page growing.
 */
export function ActivityTabs({ events, slices }: { events: OrganizerEvent[]; slices: { label: string; sold: number }[] }) {
  const [tab, setTab] = useState<TabId>("orders");
  const current = tabs.find((t) => t.id === tab)!;

  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface lg:min-h-0" aria-label="Activity">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line px-3 py-2.5 sm:px-4">
        <div role="tablist" aria-label="Dashboard details" className="flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls="activity-panel"
              onClick={() => setTab(t.id)}
              className={`h-8 shrink-0 rounded-lg px-3 text-xs font-bold transition-colors focus-visible:focus-ring ${
                tab === t.id ? "bg-gold/15 text-gold" : "text-muted hover:text-text"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {"href" in current && (
          <Link href={current.href} className="flex items-center gap-1 text-xs font-bold text-amber hover:text-gold">
            {current.link} <ArrowRight size={12} aria-hidden />
          </Link>
        )}
      </div>

      <div
        id="activity-panel"
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
        tabIndex={0}
        className="overflow-auto focus-visible:focus-ring lg:min-h-0 lg:flex-1"
      >
        {tab === "orders" && <RecentOrders />}
        {tab === "events" && <EventPerformance events={events} />}
        {tab === "mix" && <TicketMix slices={slices} />}
      </div>
    </section>
  );
}
