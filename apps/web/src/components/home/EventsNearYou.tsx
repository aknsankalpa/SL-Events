"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { EventCard } from "@/components/events/EventCard";
import { LinkButton } from "@/components/ui/Button";
import { cities, homeEvents, totalUpcomingEvents } from "@/lib/data";

const filters = ["All", ...cities] as const;

export function EventsNearYou() {
  const [city, setCity] = useState<(typeof filters)[number]>("All");
  const visible = city === "All" ? homeEvents : homeEvents.filter((e) => e.city === city);

  return (
    <section className="border-y border-line bg-surface/40 py-16">
      <div className="mx-auto max-w-site px-5">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-amber">Upcoming</p>
            <h2 className="font-display text-[34px] font-bold leading-tight text-text">Events near you</h2>
          </div>
          <div role="group" aria-label="Filter by city" className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={city === f}
                onClick={() => setCity(f)}
                className={`rounded-full border px-4 py-2 text-[13px] font-bold transition-colors focus-visible:focus-ring ${
                  city === f
                    ? "border-transparent bg-gradient-to-b from-gold to-amber text-ink"
                    : "border-line text-muted hover:border-gold/50 hover:text-text"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {visible.length > 0 ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((event) => (
              <EventCard key={event.slug} event={event} />
            ))}
          </div>
        ) : (
          <p className="mt-10 rounded-xl border border-line bg-surface p-8 text-center text-muted">
            No events in {city} yet. Check back soon.
          </p>
        )}

        <div className="mt-10 flex justify-center">
          <LinkButton href="/events" variant="outline">
            See all {totalUpcomingEvents} events <ArrowRight size={16} aria-hidden />
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
