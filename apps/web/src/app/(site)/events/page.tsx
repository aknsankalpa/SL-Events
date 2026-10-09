import type { Metadata } from "next";
import { Suspense } from "react";
import { EventsBrowser } from "@/components/events/EventsBrowser";
import { PageHeader } from "@/components/ui/PageHeader";
import { citiesWithEvents, events } from "@/lib/data";

export const metadata: Metadata = { title: "Events" };

export default function EventsPage() {
  return (
    <>
      <PageHeader
        eyebrow="All events"
        title="Find your next event"
        subtitle={`${events.length} upcoming events across ${citiesWithEvents.length} cities.`}
      />
      <Suspense fallback={<div className="mx-auto max-w-site px-5 py-10 text-sm text-muted">Loading events…</div>}>
        <EventsBrowser />
      </Suspense>
    </>
  );
}
