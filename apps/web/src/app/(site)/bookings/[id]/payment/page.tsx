import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PaymentInstructions } from "@/components/booking/PaymentInstructions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Stepper } from "@/components/ui/Stepper";
import { bookingEvent, bookings, getBooking } from "@/lib/bookings";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Pay by bank transfer" };

export function generateStaticParams() {
  return bookings.filter((b) => b.eventSlug).map((b) => ({ id: b.id }));
}

export default async function PaymentPage({ params }: Props) {
  const { id } = await params;
  const booking = getBooking(id);
  const event = booking && bookingEvent(booking);
  if (!booking || !event) notFound();

  return (
    <>
      <PageHeader
        crumbs={[
          { label: "Events", href: "/events" },
          { label: event.title, href: `/events/${event.slug}` },
          { label: "Book tickets" },
        ]}
        title="Pay by bank transfer"
        subtitle={`Booking ${booking.id} is reserved. Transfer the total to complete it.`}
      >
        <Stepper current={3} />
      </PageHeader>
      <PaymentInstructions booking={booking} event={event} />
    </>
  );
}
