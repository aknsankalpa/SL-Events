"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Check, Clock, Info, Minus, Plus } from "lucide-react";
import { OrderSummary } from "@/components/booking/OrderSummary";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/StatusBadge";
import { ticketsLeft, type EventItem } from "@/lib/data";
import { formatKrw } from "@/lib/format";

export const MAX_TICKETS = 10;
export const BOOKING_FEE = 0;

export function TicketSelector({ event }: { event: EventItem }) {
  const router = useRouter();
  // Start with 2 general tickets selected, as in the design, for events where that is possible.
  const [qty, setQty] = useState<Record<string, number>>(() => {
    const first = event.ticketTypes.find((t) => ticketsLeft(t) >= 2);
    return first ? { [first.id]: 2 } : {};
  });

  const total = Object.values(qty).reduce((n, q) => n + q, 0);
  const lines = event.ticketTypes
    .filter((t) => (qty[t.id] ?? 0) > 0)
    .map((t) => ({ label: `${qty[t.id]} × ${t.name}`, amount: qty[t.id]! * t.price }));
  const amount = lines.reduce((n, l) => n + l.amount, 0) + BOOKING_FEE;

  function change(id: string, delta: number, left: number) {
    setQty((prev) => {
      const next = Math.max(0, Math.min(left, (prev[id] ?? 0) + delta));
      const sum = Object.entries({ ...prev, [id]: next }).reduce((n, [, q]) => n + q, 0);
      if (sum > MAX_TICKETS) return prev;
      return { ...prev, [id]: next };
    });
  }

  function next() {
    const query = event.ticketTypes
      .filter((t) => (qty[t.id] ?? 0) > 0)
      .map((t) => `${t.id}:${qty[t.id]}`)
      .join(",");
    router.push(`/events/${event.slug}/book/summary?tickets=${query}`);
  }

  return (
    <div className="mx-auto grid max-w-site gap-8 px-5 py-10 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-4">
        {event.ticketTypes.map((t) => {
          const left = ticketsLeft(t);
          const soldOut = left === 0;
          const q = qty[t.id] ?? 0;
          const pct = Math.round((t.sold / t.capacity) * 100);
          return (
            <section
              key={t.id}
              aria-label={`${t.name} tickets`}
              className={`rounded-xl border p-6 ${
                soldOut ? "border-line bg-surface/60 opacity-70" : q > 0 ? "border-gold/70 bg-gold/5" : "border-line bg-surface"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-text">{t.name}</h2>
                    {!soldOut && left <= 10 && <Badge tone="danger">{left} left</Badge>}
                  </div>
                  <p className="mt-2 text-xl font-bold text-text">{formatKrw(t.price)}</p>
                </div>

                {soldOut ? (
                  <Badge className="px-3 py-1.5 text-[11px] normal-case">Sold out</Badge>
                ) : (
                  <div className="flex items-center rounded-lg border border-line bg-surface-2" role="group" aria-label={`${t.name} quantity`}>
                    <button
                      type="button"
                      aria-label={`Remove one ${t.name} ticket`}
                      disabled={q === 0}
                      onClick={() => change(t.id, -1, left)}
                      className="flex size-10 items-center justify-center text-text disabled:text-dim"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center text-sm font-bold text-text" aria-live="polite">
                      {q}
                    </span>
                    <button
                      type="button"
                      aria-label={`Add one ${t.name} ticket`}
                      disabled={q >= left || total >= MAX_TICKETS}
                      onClick={() => change(t.id, 1, left)}
                      className="flex size-10 items-center justify-center text-text disabled:text-dim"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                )}
              </div>

              <ul className="mt-4 space-y-1.5">
                {t.perks.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-xs text-muted">
                    <Check size={12} aria-hidden className="text-dim" />
                    {p}
                  </li>
                ))}
              </ul>

              <div className="mt-5 max-w-xs">
                <div className="mb-2 flex justify-between text-[11px] text-dim">
                  <span>
                    {t.sold} of {t.capacity} sold
                  </span>
                  <span>{soldOut ? "Sold out" : `${left} left`}</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-line" role="presentation">
                  <div className="h-full rounded-full bg-gradient-to-r from-gold to-amber" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </section>
          );
        })}

        <p className="flex items-center gap-2 text-xs text-dim">
          <Info size={14} aria-hidden /> Up to {MAX_TICKETS} tickets per booking. Children under 5 enter free with an adult.
        </p>
      </div>

      <div className="lg:sticky lg:top-[108px] lg:self-start">
        <OrderSummary
          event={event}
          title="Your order"
          lines={total === 0 ? [{ label: "No tickets selected", amount: 0 }] : [...lines, { label: "Booking fee", amount: BOOKING_FEE }]}
          total={amount}
        >
          <Button size="lg" className="w-full" disabled={total === 0} onClick={next}>
            Continue <ArrowRight size={16} aria-hidden />
          </Button>
          <p className="mt-3 flex items-center gap-2 text-[11px] text-dim">
            <Clock size={12} aria-hidden className="text-amber" /> Seats are held for 24 hours while you pay.
          </p>
        </OrderSummary>
      </div>
    </div>
  );
}
