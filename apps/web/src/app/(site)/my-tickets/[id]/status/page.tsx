import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ReviewStatus } from "@/components/booking/ReviewStatus";
import { PageHeader } from "@/components/ui/PageHeader";
import { Stepper } from "@/components/ui/Stepper";
import { Badge } from "@/components/ui/StatusBadge";
import { bookingEvent, bookings, getBooking } from "@/lib/bookings";
import { currentUser } from "@/lib/data";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Booking status" };

export function generateStaticParams() {
  return bookings.filter((b) => b.eventSlug).map((b) => ({ id: b.id }));
}

/** Sends each booking to the screen that matches its real status; under-review bookings render here. */
export default async function BookingStatusPage({ params }: Props) {
  const { id } = await params;
  const booking = getBooking(id);
  const event = booking && bookingEvent(booking);
  if (!booking || !event) notFound();

  if (booking.status === "confirmed") redirect(`/my-tickets/${id}`);
  if (booking.status === "awaiting_payment") redirect(`/bookings/${id}/payment`);
  if (booking.status === "proof_rejected") redirect(`/bookings/${id}/proof`);
  if (booking.status !== "under_review") notFound();

  return (
    <>
      <PageHeader
        crumbs={[{ label: "My tickets", href: "/my-tickets" }, { label: `Booking ${booking.id}` }]}
        title="Payment under review"
        titleAside={
          <Badge tone="warning" dot>
            Under review
          </Badge>
        }
        subtitle={`Thanks, ${currentUser.firstName}. We're checking your transfer now.`}
      >
        <Stepper current={5} />
      </PageHeader>
      <ReviewStatus booking={booking} event={event} />
    </>
  );
}
