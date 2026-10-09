import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TicketViewer } from "@/components/tickets/TicketViewer";
import { Breadcrumbs } from "@/components/ui/PageHeader";
import { bookingEvent, bookings, getBooking, issuedTickets, type IssuedTicket } from "@/lib/bookings";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "QR tickets" };

export function generateStaticParams() {
  return bookings.filter((b) => b.eventSlug).map((b) => ({ id: b.id }));
}

/** Placeholder codes for confirmed bookings without issued tickets in the mock data. */
function fallbackTickets(names: string[], ticketName: string, id: string): IssuedTicket[] {
  return names.map((holder, i) => ({ code: `SLE-${id.slice(-4)}-${String(i + 1).padStart(4, "0")}`, holder, ticketName, scanned: false }));
}

export default async function QrTicketPage({ params }: Props) {
  const { id } = await params;
  const booking = getBooking(id);
  const event = booking && bookingEvent(booking);
  if (!booking || !event) notFound();
  if (booking.status !== "confirmed") redirect(`/my-tickets/${id}/status`);

  const tickets = issuedTickets[id] ?? fallbackTickets(booking.attendees, booking.lines[0]!.ticketName, id);

  return (
    <>
      <div className="mx-auto max-w-site px-5 pt-6">
        <Breadcrumbs crumbs={[{ label: "My tickets", href: "/my-tickets" }, { label: event.title }]} />
      </div>
      <TicketViewer event={event} bookingId={booking.id} tickets={tickets} />
    </>
  );
}
