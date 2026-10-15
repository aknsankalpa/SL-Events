import Link from "next/link";
import { ArrowRight, CalendarPlus, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/StatusBadge";
import { daysUntil, eventStatusLabel, type OrganizerEvent } from "@/lib/organizer";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

const tone = { on_sale: "success", draft: "neutral", in_review: "warning" } as const;

/** Events that haven't happened yet, soonest first. */
export function upcomingOf(events: OrganizerEvent[]) {
  return events
    .filter((e): e is OrganizerEvent & { startsAt: string } => !!e.startsAt && daysUntil(e.startsAt) >= 0)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

function inDays(days: number) {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `in ${days} days`;
}

/** On desktop the dashboard is one fixed screen, so this panel fills its slot and the list scrolls inside it. */
export function UpcomingEvents({ events }: { events: OrganizerEvent[] }) {
  const list = upcomingOf(events);

  return (
    <section
      className="flex flex-col rounded-2xl border border-line bg-surface p-4 sm:p-5 lg:min-h-0"
      aria-label="Upcoming events"
    >
      <div className="flex shrink-0 items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-text">Upcoming events</h2>
          <p className="mt-1 text-[11px] text-dim lg:[@media(max-height:760px)]:hidden">
            {list.length === 0 ? "Nothing scheduled" : `${list.length} event${list.length === 1 ? "" : "s"} coming up`}
          </p>
        </div>
        <Link href="/organizer/events" className="flex items-center gap-1 text-xs font-bold text-amber hover:text-gold">
          All events <ArrowRight size={12} aria-hidden />
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-line p-6 text-center">
          <p className="text-sm text-muted">You have no upcoming events.</p>
          <Link
            href="/organizer/events/new"
            className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-amber hover:text-gold"
          >
            <CalendarPlus size={14} aria-hidden /> Create an event
          </Link>
        </div>
      ) : (
        <ul className="mt-4 space-y-2.5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1 lg:[@media(max-height:760px)]:mt-3">
          {list.map((e) => {
            const d = new Date(`${e.startsAt.slice(0, 10)}T00:00:00Z`);
            const days = daysUntil(e.startsAt);
            const pct = e.capacity ? Math.min(100, Math.round((e.sold / e.capacity) * 100)) : 0;
            return (
              <li key={e.id}>
                <Link
                  href={`/organizer/events/${e.id}/edit`}
                  className="block rounded-xl border border-line bg-surface-2 p-3 transition-colors hover:border-gold/50 focus-visible:focus-ring"
                >
                  <span className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-b from-gold to-amber text-ink"
                    >
                      <span className="text-[9px] font-bold leading-none tracking-wider">{MONTHS[d.getUTCMonth()]}</span>
                      <span className="mt-1 text-lg font-bold leading-none">{d.getUTCDate()}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold leading-snug text-text">{e.title}</span>
                      <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-dim">
                        <span className="shrink-0 font-bold text-amber">{inDays(days)}</span>
                        {e.venue && (
                          <>
                            <MapPin size={11} aria-hidden className="shrink-0" />
                            <span className="truncate">{e.venue}</span>
                          </>
                        )}
                      </span>
                    </span>
                    <Badge tone={tone[e.status]} className="shrink-0">
                      {eventStatusLabel[e.status]}
                    </Badge>
                  </span>
                  <span className="mt-2.5 flex items-center gap-3">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line" role="presentation">
                      <span className="block h-full rounded-full bg-gradient-to-r from-amber to-gold" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="shrink-0 text-[11px] text-muted">
                      {e.sold}/{e.capacity}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
