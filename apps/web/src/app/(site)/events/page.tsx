import type { Metadata } from "next";
import { Suspense } from "react";
import { EventsBrowser } from "@/components/events/EventsBrowser";
import { PageHeader } from "@/components/ui/PageHeader";
import { listEvents } from "@/server/events";

export const metadata: Metadata = { title: "Events" };

export default async function EventsPage() {
  const events = await listEvents();
  const cities = new Set(events.map((e) => e.city).filter(Boolean)).size;
  return (
    <>
      <PageHeader
        eyebrow="All events"
        title="Find your next event"
        subtitle={`${events.length} upcoming events across ${cities} cities.`}
      />
      <Suspense fallback={<div className="mx-auto max-w-site px-5 py-10 text-sm text-muted">Loading events…</div>}>
        <EventsBrowser />
      </Suspense>
    </>
  );
}
