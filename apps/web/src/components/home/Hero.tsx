import { AlertTriangle, CalendarDays, MapPin, QrCode, Search, Ticket } from "lucide-react";
import { CategoryIcon, coverGradients, coverIconClass } from "@/components/events/CategoryIcon";
import { useBookings, useNow } from "@/components/booking/useBookings";
import { LinkButton } from "@/components/ui/Button";
import { bookingEvent, canIssueTickets, ticketCount, ticketSummary } from "@/lib/bookings";
import { citiesWithEvents, events } from "@/lib/data";
import { Select } from "@/components/ui/Select";

/** A reminder for the first booking that needs the customer to act: pay, or fix a failed payment. Nothing when all is well. */
export function ActionBanner() {
  const { bookings } = useBookings();
  const b = bookings.find((x) => x.status === "awaiting_payment") ?? bookings.find((x) => x.status === "proof_rejected");
  if (!b) return null;
  const failed = b.status === "proof_rejected";
  return (
    <div className="mx-auto max-w-site px-5 pt-6">
      <div className="flex flex-col gap-3 rounded-lg border border-gold/40 bg-gold/10 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-3 text-sm font-bold text-gold">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
          {failed
            ? `Your payment for ${b.eventTitle} didn't go through. Upload new proof${b.payBy ? ` by ${b.payBy}` : ""}, or your seats are released.`
            : `Upload your payment proof for ${b.eventTitle}${b.payBy ? ` by ${b.payBy}` : ""}, or your seats are released.`}
        </p>
        <LinkButton href={`/bookings/${b.id}/proof`} size="sm" className="shrink-0">
          Upload proof
        </LinkButton>
      </div>
    </div>
  );
}

export function Hero({ firstName }: { firstName: string }) {
  const { bookings } = useBookings();
  const wallet = bookings.filter((b) => b.status === "confirmed" && canIssueTickets(b)).reduce((n, b) => n + ticketCount(b), 0);
  return (
    <section className="bg-hero-glow">
      <div className="mx-auto grid max-w-site items-center gap-12 px-5 py-14 lg:grid-cols-[1.15fr_1fr] lg:py-16">
        <div>
          <p className="mb-5 text-xs font-bold uppercase tracking-widest text-amber">
            Welcome back, {firstName}
          </p>
          <h1 className="font-display text-5xl font-bold leading-[1.05] text-text sm:text-6xl lg:text-[72px]">
            Discover.
            <br />
            Book.
            <br />
            <span className="text-gold">Experience.</span>
          </h1>
          <p className="mt-6 max-w-md text-[17px] leading-relaxed text-muted">
            Concerts, cricket, culture and food festivals for the Sri Lankan community across Korea.
          </p>

          <form
            action="/events"
            role="search"
            className="mt-8 flex max-w-xl flex-col gap-2 rounded-xl border border-line bg-surface/90 p-2 sm:flex-row sm:items-center"
          >
            <label className="flex flex-1 items-center gap-3 px-3">
              <Search size={18} className="text-muted" aria-hidden />
              <span className="sr-only">Search events, artists or venues</span>
              <input
                name="q"
                type="search"
                placeholder="Search events, artists or venues"
                className="h-11 w-full bg-transparent text-sm text-text placeholder:text-muted focus:outline-none"
              />
            </label>
            <label className="flex items-center gap-2 border-line px-3 sm:border-l">
              <MapPin size={16} className="text-muted" aria-hidden />
              <span className="sr-only">Location</span>
              <Select
                name="city"
                defaultValue=""
                className="h-11 bg-transparent pr-3 text-sm text-muted focus:outline-none"
              >
                <option value="" className="bg-surface text-text">
                  All locations
                </option>
                {citiesWithEvents.map((c) => (
                  <option key={c} value={c} className="bg-surface text-text">
                    {c}
                  </option>
                ))}
              </Select>
            </label>
            <button
              type="submit"
              className="h-11 rounded-lg bg-gradient-to-b from-gold to-amber px-6 text-sm font-bold text-ink hover:brightness-110 focus-visible:focus-ring"
            >
              Search
            </button>
          </form>

          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
            {[
              [String(events.length), "upcoming events"],
              [String(events.filter((e) => e.city === "Seoul").length), "events in Seoul"],
              [String(wallet), wallet === 1 ? "ticket in your wallet" : "tickets in your wallet"],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="sr-only">{label}</dt>
                <dd className="flex items-baseline gap-2">
                  <span className="font-display text-3xl font-bold text-gold">{value}</span>
                  <span className="text-[13px] text-muted">{label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <NextEventCard />
      </div>
    </section>
  );
}

/** The soonest event the customer has paid for, or an invitation to find one. */
function NextEventCard() {
  const { bookings } = useBookings();
  const now = useNow();
  const next = bookings
    .filter((b) => b.status === "confirmed" && canIssueTickets(b))
    .map((b) => ({ b, e: bookingEvent(b) }))
    .filter((x) => x.e && (now === 0 || new Date(x.e.startsAt).getTime() >= now))
    .sort((a, b) => a.e!.startsAt.localeCompare(b.e!.startsAt))[0];

  if (!next) {
    return (
      <article className="overflow-hidden rounded-2xl border border-line bg-surface p-8 shadow-2xl shadow-black/50">
        <span className="flex size-12 items-center justify-center rounded-xl bg-gold/15 text-gold">
          <Ticket size={22} aria-hidden />
        </span>
        <h2 className="mt-5 text-2xl font-bold text-text">Find your next event</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Nothing booked yet. Browse what&apos;s on, pay by bank transfer and your QR tickets will be waiting here.
        </p>
        <LinkButton href="/events" className="mt-6">
          Explore events
        </LinkButton>
      </article>
    );
  }

  const { b, e } = next;
  const days = Math.max(0, Math.ceil((new Date(e!.startsAt).getTime() - now) / 86_400_000));
  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl shadow-black/50">
      <div className={`relative flex h-36 items-center justify-center bg-gradient-to-br ${coverGradients[e!.category]}`}>
        <span className="absolute left-4 top-4 rounded-full border border-gold/40 bg-black/60 px-2.5 py-1 text-[10px] font-bold uppercase text-gold">
          {e!.category}
        </span>
        <CategoryIcon id={e!.category} size={56} strokeWidth={1.5} className={coverIconClass(e!.category)} />
      </div>
      <div className="space-y-3 p-6">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-amber">Your next event</p>
          <span className="rounded-full border border-success/40 bg-success/10 px-2.5 py-1 text-[10px] font-bold text-success">CONFIRMED</span>
        </div>
        <h2 className="text-2xl font-bold text-text">{e!.title}</h2>
        <p className="flex items-center gap-2 text-[13px] text-muted">
          <CalendarDays size={14} aria-hidden /> {e!.longDate} · {e!.time}
        </p>
        <p className="flex items-center gap-2 text-[13px] text-muted">
          <MapPin size={14} aria-hidden /> {e!.venue}, {e!.city}
        </p>
        <div className="flex items-end justify-between gap-4 pt-2">
          <div>
            <p className="text-xs text-dim">{ticketSummary(b)}</p>
            <p className="text-sm font-bold text-text">{now === 0 ? " " : days === 0 ? "Today" : `Starts in ${days} day${days === 1 ? "" : "s"}`}</p>
          </div>
          <LinkButton href={`/my-tickets/${b.id}`} size="sm">
            <QrCode size={16} aria-hidden /> View QR tickets
          </LinkButton>
        </div>
      </div>
    </article>
  );
}
