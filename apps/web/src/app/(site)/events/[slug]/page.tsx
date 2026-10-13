import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventDetailsView } from "@/components/events/EventDetailsView";
import { events, getEvent } from "@/lib/data";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return events.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = getEvent(slug);
  return { title: event?.title ?? "Event" };
}

export default async function EventDetailsPage({ params }: Props) {
  const { slug } = await params;
  const event = getEvent(slug);
  if (!event) notFound();

  return <EventDetailsView event={event} />;
}
