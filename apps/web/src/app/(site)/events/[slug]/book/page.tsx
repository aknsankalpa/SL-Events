import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TicketSelector } from "@/components/booking/TicketSelector";
import { SeatSelector } from "@/components/seats/SeatSelector";
import { PageHeader } from "@/components/ui/PageHeader";
import { Stepper } from "@/components/ui/Stepper";
import { events, getEvent } from "@/lib/data";

type Props = { params: Promise<{ slug: string }> };

export const metadata: Metadata = { title: "Choose your tickets" };

export function generateStaticParams() {
  return events.map((e) => ({ slug: e.slug }));
}

export default async function BookTicketsPage({ params }: Props) {
  const { slug } = await params;
  const event = getEvent(slug);
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
