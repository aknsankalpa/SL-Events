import type { ReactNode } from "react";
import { Card, EventThumb, Row } from "@/components/ui/Card";
import type { EventItem } from "@/lib/data";
import { formatKrw } from "@/lib/format";

export type SummaryLine = { label: string; amount: number };

type OrderSummaryProps = {
  event: EventItem;
  title?: string;
  /** Small "Booking" header with the booking number instead of a card title. */
  bookingId?: string;
  lines: SummaryLine[];
  total: number;
  totalLabel?: string;
  children?: ReactNode;
  className?: string;
};

export function OrderSummary({ event, title, bookingId, lines, total, totalLabel = "Total", children, className = "" }: OrderSummaryProps) {
  return (
    <Card className={`p-6 ${className}`}>
      {title && <h2 className="mb-5 text-lg font-bold text-text">{title}</h2>}
      {bookingId && (
        <div className="mb-5 flex items-center justify-between text-xs">
          <span className="text-dim">Booking</span>
          <span className="font-mono font-bold text-text">{bookingId}</span>
        </div>
      )}

      <div className="flex items-center gap-4">
        <EventThumb category={event.category} size={52} />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[13px] font-bold text-text">{event.title}</p>
          <p className="mt-1.5 text-[11px] text-dim">
            {event.longDate} · {event.time}
          </p>
          <p className="mt-0.5 text-[11px] text-dim">
            {event.venue}, {event.city}
          </p>
        </div>
      </div>

      <div className="mt-5 border-t border-line pt-3">
        {lines.map((l) => (
          <Row key={l.label} label={l.label} value={formatKrw(l.amount)} />
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-line pt-4">
        <span className="text-[13px] font-bold text-text">{totalLabel}</span>
        <span className="text-2xl font-bold text-text">{formatKrw(total)}</span>
      </div>

      {children && <div className="mt-5">{children}</div>}
    </Card>
  );
}
