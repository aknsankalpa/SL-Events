import { ArrowRight, CalendarDays, MapPin, Search, Sparkles } from "lucide-react";
import { CategoryIcon, coverGradients, coverIconClass } from "@/components/events/CategoryIcon";
import { LinkButton } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/StatusBadge";
import { citiesWithEvents, events, fromPrice } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { featuredEvents, organizerProfiles, ticketsLeftTotal } from "@/lib/organizers";

/** The home page for visitors who aren't signed in: search, a clear way into the events, and one featured event. */
export function PublicHero() {
  const featured = featuredEvents[0];

  return (
    <section className="bg-hero-glow">
      <div className="mx-auto grid max-w-site items-center gap-12 px-5 py-14 lg:grid-cols-[1.15fr_1fr] lg:py-16">
        <div>
          <p className="mb-5 text-xs font-bold uppercase tracking-widest text-amber">Sri Lankan events in Korea</p>
          <h1 className="font-display text-5xl font-bold leading-[1.05] text-text sm:text-6xl lg:text-[72px]">
            Discover.
            <br />
            Book.
            <br />
            <span className="text-gold">Experience.</span>
          </h1>
          <p className="mt-6 max-w-md text-[17px] leading-relaxed text-muted">
            Concerts, cricket, culture and food festivals for the Sri Lankan community. Pay by bank transfer and walk in with a QR
            ticket.
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
              <Select name="city" defaultValue="" className="h-11 bg-transparent pr-3 text-sm text-muted focus:outline-none">
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

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <LinkButton href="/events" size="lg">
              Explore events <ArrowRight size={16} aria-hidden />
            </LinkButton>
            <LinkButton href="/become-an-organizer" variant="outline" size="lg">
              Become an organizer
            </LinkButton>
          </div>

          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
            {[
              [String(events.length), "upcoming events"],
              [String(citiesWithEvents.length), "cities"],
              [String(organizerProfiles.length), "organizers"],
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

        {featured && (
          <article className="overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl shadow-black/50">
            <div className={`relative flex h-36 items-center justify-center bg-gradient-to-br ${coverGradients[featured.category]}`}>
              <span className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full border border-gold/40 bg-black/60 px-2.5 py-1 text-[10px] font-bold uppercase text-gold">
                <Sparkles size={11} aria-hidden /> Featured
              </span>
              <CategoryIcon id={featured.category} size={56} strokeWidth={1.5} className={coverIconClass(featured.category)} />
            </div>
            <div className="space-y-3 p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-widest text-amber">{featured.badgeDate}</p>
                <Badge tone={ticketsLeftTotal(featured) <= 20 ? "danger" : "success"}>{ticketsLeftTotal(featured)} tickets left</Badge>
              </div>
              <h2 className="text-2xl font-bold text-text">{featured.title}</h2>
              <p className="flex items-center gap-2 text-[13px] text-muted">
                <CalendarDays size={14} aria-hidden /> {featured.dateLabel}
              </p>
              <p className="flex items-center gap-2 text-[13px] text-muted">
                <MapPin size={14} aria-hidden /> {featured.venue}, {featured.city}
              </p>
              <div className="flex items-end justify-between gap-4 pt-2">
                <div>
                  <p className="text-xs text-dim">Tickets from</p>
                  <p className="text-lg font-bold text-text">{formatPrice(fromPrice(featured))}</p>
                </div>
                <LinkButton href={`/events/${featured.slug}`} size="sm">
                  View event <ArrowRight size={14} aria-hidden />
                </LinkButton>
              </div>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
