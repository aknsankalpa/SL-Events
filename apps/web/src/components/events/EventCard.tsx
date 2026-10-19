import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { fromPrice, type EventItem } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { ticketsLeftTotal } from "@/lib/organizers";
import { CategoryIcon, coverGradients, coverIconClass } from "./CategoryIcon";

export function EventCard({ event }: { event: EventItem }) {
  const left = ticketsLeftTotal(event);
  return (
    <Link
      href={`/events/${event.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-line bg-surface transition-colors hover:border-gold/50 focus-visible:focus-ring"
    >
      <div className={`relative flex h-40 items-center justify-center bg-gradient-to-br ${coverGradients[event.category]}`}>
        <span className="absolute left-3 top-3 rounded-full border border-gold/40 bg-black/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-gold">
          {event.category}
        </span>
        {left === 0 ? (
          <span className="absolute right-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-bold text-muted">SOLD OUT</span>
        ) : (
          (event.fewLeft || left <= 20) && (
            <span className="absolute right-3 top-3 rounded-full bg-danger px-2.5 py-1 text-[10px] font-bold text-white">FEW LEFT</span>
          )
        )}
        <CategoryIcon id={event.category} size={52} strokeWidth={1.5} className={`${coverIconClass(event.category)} transition-transform group-hover:scale-110`} />
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-amber">{event.badgeDate}</p>
        <h3 className="text-xl font-bold leading-snug text-text">{event.title}</h3>
        <p className="flex items-center gap-2 text-[13px] text-muted">
          <MapPin size={14} aria-hidden className="shrink-0 text-dim" />
          {event.venue}, {event.city}
        </p>
        <p className="flex items-center gap-2 text-[13px] text-muted">
          <CalendarDays size={14} aria-hidden className="shrink-0 text-dim" />
          {event.dateLabel}
        </p>

        <div className="mt-auto flex items-center justify-between border-t border-line pt-4">
          <span className="leading-tight">
            <span className="block text-base font-bold text-text">
              {event.singlePrice || fromPrice(event) === 0 ? "" : "From "}
              {formatPrice(fromPrice(event))}
            </span>
            <span className={`mt-0.5 block text-[11px] ${left === 0 ? "text-dim" : left <= 20 ? "text-danger" : "text-success"}`}>
              {left === 0 ? "No tickets left" : `${left} ticket${left === 1 ? "" : "s"} left`}
            </span>
          </span>
          <span className="flex items-center gap-1.5 text-[13px] font-bold text-amber">
            View event
            <ArrowRight size={14} aria-hidden className="transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </Link>
  );
}
