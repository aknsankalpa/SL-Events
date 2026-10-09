"use client";

import { useState } from "react";
import { CalendarPlus, Check, Heart, Share2, Ticket } from "lucide-react";
import { Badge } from "@/components/ui/StatusBadge";
import { LinkButton } from "@/components/ui/Button";
import { buildIcs, downloadIcs } from "@/lib/calendar";
import { lowestListedPrice, ticketsLeft, type EventItem } from "@/lib/data";
import { formatPrice } from "@/lib/format";

export function EventTicketsCard({ event }: { event: EventItem }) {
  const [saved, setSaved] = useState(false);
  const [shared, setShared] = useState(false);
  const allSoldOut = event.ticketTypes.every((t) => ticketsLeft(t) === 0);

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: event.title, url });
      else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch {
      /* user cancelled the share sheet */
    }
  }

  function addToCalendar() {
    downloadIcs(
      `${event.slug}.ics`,
      buildIcs({ title: event.title, startsAt: event.startsAt, location: `${event.venue}, ${event.area}` }),
    );
  }

  return (
    <aside className="h-fit rounded-xl border border-gold/30 bg-surface p-6 lg:sticky lg:top-[108px]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-text">Tickets</h2>
        <button
          type="button"
          onClick={share}
          className="flex items-center gap-1.5 text-xs text-muted hover:text-gold"
          aria-live="polite"
        >
          {shared ? <Check size={14} /> : <Share2 size={14} />}
          {shared ? "Link copied" : "Share"}
        </button>
      </div>

      <ul className="divide-y divide-line">
        {event.ticketTypes.map((t) => {
          const left = ticketsLeft(t);
          return (
            <li key={t.id} className="flex items-start justify-between gap-3 py-4 first:pt-0">
              <div>
                <p className="text-sm font-bold text-text">{t.name}</p>
                <p className="mt-1 text-xs text-dim">{t.summary ?? t.perks[0]}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <p className="text-sm font-bold text-text">{formatPrice(t.price)}</p>
                {left === 0 ? (
                  <Badge>Sold out</Badge>
                ) : left <= 10 ? (
                  <Badge tone="danger">{left} left</Badge>
                ) : (
                  <Badge tone="success">Available</Badge>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-2 flex items-center justify-between border-t border-line pt-5">
        <span className="text-xs text-muted">Tickets from</span>
        <span className="text-2xl font-bold text-text">{formatPrice(lowestListedPrice(event))}</span>
      </div>

      {allSoldOut ? (
        <p className="mt-5 rounded-lg border border-line bg-surface-2 p-3 text-center text-sm text-muted">This event is sold out.</p>
      ) : (
        <LinkButton href={`/events/${event.slug}/book`} size="lg" className="mt-5 w-full">
          <Ticket size={16} aria-hidden /> Select tickets
        </LinkButton>
      )}
      <p className="mt-3 text-center text-[11px] text-dim">You&apos;ll pay by bank transfer, then upload your receipt.</p>

      <div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-xs font-bold">
        <button type="button" onClick={addToCalendar} className="flex items-center gap-2 text-muted hover:text-gold">
          <CalendarPlus size={14} aria-hidden /> Add to calendar
        </button>
        <button
          type="button"
          aria-pressed={saved}
          onClick={() => setSaved((v) => !v)}
          className={`flex items-center gap-2 ${saved ? "text-gold" : "text-muted hover:text-gold"}`}
        >
          <Heart size={14} aria-hidden fill={saved ? "currentColor" : "none"} /> {saved ? "Saved" : "Save"}
        </button>
      </div>
    </aside>
  );
}
