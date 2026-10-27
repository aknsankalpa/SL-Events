"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowRight, Clock, Info, X } from "lucide-react";
import { OrderSummary } from "@/components/booking/OrderSummary";
import { BOOKING_FEE } from "@/components/booking/TicketSelector";
import { Button } from "@/components/ui/Button";
import type { EventItem } from "@/lib/data";
import { formatKrw } from "@/lib/format";
import { MAX_PER_BOOKING } from "@/lib/bookings";
import { prepareSeatBooking, type SeatChart } from "@/lib/seating";
import { SeatPicker } from "./SeatPicker";
import { useTakenSeats } from "./useTakenSeats";

/** Step 1 for a numbered-seat event: pick seats on the chart. The summary beside it (or the bar below, on a phone) follows along. */
export function SeatSelector({ event, chart }: { event: EventItem; chart: SeatChart }) {
  const router = useRouter();
  const taken = useTakenSeats(event.slug);
  const [picked, setPicked] = useState<string[]>([]);
  const [message, setMessage] = useState<string>();

  // Seats that got taken while the page was open drop out of the selection instead of silently staying in it.
  const ids = useMemo(() => picked.filter((id) => !taken.has(id)), [picked, taken]);
  const prepared = useMemo(() => prepareSeatBooking(chart, taken, ids, MAX_PER_BOOKING), [chart, taken, ids]);
  const seats = prepared.ok ? prepared.seats : [];
  const priceOf = new Map(chart.sections.map((s) => [s.id, s] as const));
  const total = prepared.ok ? prepared.total : 0;

  function toggle(id: string) {
    if (picked.includes(id)) {
      setMessage(undefined);
      setPicked(picked.filter((x) => x !== id));
    } else if (picked.length >= MAX_PER_BOOKING) {
      setMessage(`You can book up to ${MAX_PER_BOOKING} seats at a time.`);
    } else {
      setMessage(undefined);
      setPicked([...picked, id]);
    }
  }

  function selectMany(list: string[]) {
    setMessage(undefined);
    setPicked(list.slice(0, MAX_PER_BOOKING));
  }

  function next() {
    if (!prepared.ok) return;
    router.push(`/events/${event.slug}/book/summary?seats=${prepared.seats.map((s) => encodeURIComponent(s.id)).join(",")}`);
  }

  const lines = seats.map((s) => ({ label: `Seat ${s.label} · ${priceOf.get(s.sectionId)?.name ?? ""}`, amount: priceOf.get(s.sectionId)?.price ?? 0 }));

  return (
    <div className="mx-auto grid max-w-site gap-8 px-5 py-10 pb-32 lg:grid-cols-[1fr_22rem] lg:pb-10">
      <div className="min-w-0 space-y-4">
        <SeatPicker chart={chart} taken={taken} selected={ids} onToggle={toggle} onSelectMany={selectMany} max={MAX_PER_BOOKING} />
        <p role={message ? "alert" : undefined} className={`flex items-center gap-2 text-xs ${message ? "font-bold text-amber" : "text-dim"}`}>
          <Info size={14} aria-hidden />
          {message ?? `Choose up to ${MAX_PER_BOOKING} seats per booking. There is no booking fee at the moment.`}
        </p>
      </div>

      <div className="lg:sticky lg:top-[108px] lg:self-start">
        <OrderSummary
          event={event}
          title="Your seats"
          lines={seats.length === 0 ? [{ label: "No seats selected", amount: 0 }] : [...lines, { label: "Booking fee", amount: BOOKING_FEE }]}
          total={total + (seats.length ? BOOKING_FEE : 0)}
        >
          {seats.length > 0 && (
            <ul className="mb-4 flex flex-wrap gap-1.5" aria-label="Chosen seats">
              {seats.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => toggle(s.id)}
                    aria-label={`Remove seat ${s.label}`}
                    className="flex items-center gap-1.5 rounded-full border border-gold/50 bg-gold/10 py-1 pl-3 pr-2 text-xs font-bold text-gold focus-visible:focus-ring"
                  >
                    {s.label} <X size={12} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Button size="lg" className="w-full" disabled={seats.length === 0} onClick={next}>
            Continue <ArrowRight size={16} aria-hidden />
          </Button>
          <p className="mt-3 flex items-center gap-2 text-[11px] text-dim">
            <Clock size={12} aria-hidden className="text-amber" /> Seats are held for 24 hours while you pay.
          </p>
        </OrderSummary>
      </div>

      {/* On a phone the summary is far below the chart, so the total and Continue stay in reach. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-page/95 px-5 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-site items-center gap-4">
          <div className="leading-tight">
            <p className="text-[11px] text-dim">
              {seats.length} seat{seats.length === 1 ? "" : "s"}
            </p>
            <p className="text-lg font-bold text-text">{formatKrw(total)}</p>
          </div>
          <Button size="lg" className="flex-1" disabled={seats.length === 0} onClick={next}>
            Continue <ArrowRight size={16} aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}
