import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TicketSelector } from "@/components/booking/TicketSelector";
import { SeatSelector } from "@/components/seats/SeatSelector";
import { PageHeader } from "@/components/ui/PageHeader";
import { Stepper } from "@/components/ui/Stepper";
import { getEventBySlug, listEventSlugs } from "@/server/events";

type Props = { params: Promise<{ slug: string }> };

export const metadata: Metadata = { title: "Choose your tickets" };

export async function generateStaticParams() {
  return (await listEventSlugs()).map((slug) => ({ slug }));
}

async function BookContent({ params }: Props) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  return (
    <>
      <PageHeader
        crumbs={[
          { label: "Events", href: "/events" },
          { label: event.title, href: `/events/${event.slug}` },
          { label: "Book tickets" },
        ]}
        title={event.seatChart ? "Choose your seats" : "Choose your tickets"}
      >
        <Stepper current={1} />
      </PageHeader>
      {event.seatChart ? <SeatSelector event={event} chart={event.seatChart} /> : <TicketSelector event={event} />}
    </>
  );
}

export default function BookTicketsPage({ params }: Props) {
  // The params are read inside the boundary, so an event published after the build still gets an instant page shell.
  return (
    <Suspense fallback={<div className="mx-auto min-h-[60vh] max-w-site px-5 py-10 text-sm text-muted">Loading…</div>}>
      <BookContent params={params} />
    </Suspense>
  );
}
