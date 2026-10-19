import Link from "next/link";
import { ArrowRight, MapPin, Mic2, Sparkles } from "lucide-react";
import { EventCard } from "@/components/events/EventCard";
import { LinkButton } from "@/components/ui/Button";
import { featuredEvents, popularOrganizers } from "@/lib/organizers";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

/** The most in-demand events that still have tickets. */
export function FeaturedEvents() {
  return (
    <section id="featured" className="mx-auto max-w-site scroll-mt-24 px-5 py-16">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber">
            <Sparkles size={13} aria-hidden /> Featured
          </p>
          <h2 className="font-display text-[34px] font-bold leading-tight text-text">Selling fast right now</h2>
        </div>
        <LinkButton href="/events" variant="outline" size="sm">
          Explore events <ArrowRight size={14} aria-hidden />
        </LinkButton>
      </div>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {featuredEvents.map((e) => (
          <EventCard key={e.slug} event={e} />
        ))}
      </div>
    </section>
  );
}

/** Organizers ranked by tickets sold, each linking to their events. */
export function PopularOrganizers() {
  const top = popularOrganizers.slice(0, 4);
  return (
    <section id="organizers" className="mx-auto max-w-site scroll-mt-24 px-5 py-16">
      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-amber">Organizers</p>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <h2 className="font-display text-[34px] font-bold leading-tight text-text">Popular organizers</h2>
        <p className="max-w-xs text-sm leading-relaxed text-muted">The groups behind the community&apos;s favourite nights.</p>
      </div>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {top.map((o) => (
          <li key={o.slug}>
            <Link
              href={`/events?organizer=${o.slug}`}
              className="flex h-full flex-col rounded-xl border border-line bg-surface p-5 transition-colors hover:border-gold/50 focus-visible:focus-ring"
            >
              <span className="flex size-12 items-center justify-center rounded-full border border-gold/60 bg-surface-2 text-sm font-bold text-gold">
                {initials(o.name) || <Mic2 size={18} aria-hidden />}
              </span>
              <h3 className="mt-4 text-[15px] font-bold leading-snug text-text">{o.name}</h3>
              <p className="mt-2 line-clamp-3 flex-1 text-[13px] leading-relaxed text-muted">{o.about}</p>
              <p className="mt-4 flex items-center gap-1.5 text-[11px] text-dim">
                <MapPin size={11} aria-hidden /> {o.cities.join(", ")}
              </p>
              <p className="mt-3 flex items-center justify-between border-t border-line pt-3 text-xs">
                <span className="text-muted">
                  {o.eventCount} event{o.eventCount === 1 ? "" : "s"} · {o.ticketsSold} tickets sold
                </span>
                <ArrowRight size={13} aria-hidden className="text-amber" />
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A closing prompt for people who want to find events, and for people who want to run them. */
export function ExploreBanner() {
  return (
    <section className="mx-auto max-w-site px-5 pb-16">
      <div className="flex flex-col items-start gap-6 rounded-2xl border border-gold/30 bg-gradient-to-r from-surface via-surface to-[#2a0d0d] p-8 sm:p-10 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-display text-[30px] font-bold leading-tight text-text">Ready for your next night out?</h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted">
            Browse every upcoming event, or apply to become an organizer and sell tickets to the community.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <LinkButton href="/events" size="lg">
            Explore events <ArrowRight size={16} aria-hidden />
          </LinkButton>
          <LinkButton href="/become-an-organizer" variant="outline" size="lg">
            Become an organizer
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
