import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EventDetailsView } from "@/components/events/EventDetailsView";
import { getEventBySlug, listEventSlugs } from "@/server/events";

type Props = { params: Promise<{ slug: string }> };

/** Events that exist at build time are prerendered; events published later are rendered on their first visit. */
export async function generateStaticParams() {
  return (await listEventSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  return { title: event?.title ?? "Event" };
}

async function EventContent({ params }: Props) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();
  return <EventDetailsView event={event} />;
}

export default function EventDetailsPage({ params }: Props) {
  // The params are read inside the boundary, so an event published after the build still gets an instant page shell.
  return (
    <Suspense fallback={<div className="mx-auto min-h-[60vh] max-w-site px-5 py-10 text-sm text-muted">Loading event…</div>}>
      <EventContent params={params} />
    </Suspense>
  );
}
