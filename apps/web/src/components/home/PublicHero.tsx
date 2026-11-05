import { ArrowRight, MapPin, Search } from "lucide-react";
import { LatestEventsStack } from "@/components/home/LatestEventsStack";
import { StatIcon } from "@/components/home/StatIcon";
import { LinkButton } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { citiesWithEvents, events } from "@/lib/data";
import { organizerProfiles } from "@/lib/organizers";

/** The next events by date, shown as the stack of cards beside the welcome text. */
const latestEvents = [...events].sort((a, b) => a.startsAt.localeCompare(b.startsAt)).slice(0, 6);

/** The home page for visitors who aren't signed in: search, a clear way into the events, and the latest events as stacked cards. */
export function PublicHero() {

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
              [String(events.length), "upcoming events", "upcoming"],
              [String(citiesWithEvents.length), "cities", "cities"],
              [String(organizerProfiles.length), "organizers", "organizers"],
            ].map(([value, label, icon]) => (
              <div key={label} className="flex items-center gap-3">
                <StatIcon name={icon as "upcoming" | "cities" | "organizers"} />
                <dt className="sr-only">{label}</dt>
                <dd className="flex items-baseline gap-2">
                  <span className="font-display text-3xl font-bold text-gold">{value}</span>
                  <span className="text-[13px] text-muted">{label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <LatestEventsStack events={latestEvents} />
      </div>
    </section>
  );
}
