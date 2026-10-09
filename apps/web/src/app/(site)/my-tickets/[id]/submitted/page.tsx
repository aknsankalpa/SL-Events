import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReviewStatus } from "@/components/booking/ReviewStatus";
import { Badge } from "@/components/ui/StatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { Stepper } from "@/components/ui/Stepper";
import { currentUser } from "@/lib/data";
import { bookingEvent, bookings, getBooking } from "@/lib/bookings";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Payment under review" };

export function generateStaticParams() {
  return bookings.filter((b) => b.eventSlug).map((b) => ({ id: b.id }));
}

/** Shown right after a customer submits proof: the booking is in review whatever its stored status. */
export default async function SubmittedPage({ params }: Props) {
  const { id } = await params;
  const booking = getBooking(id);
  const event = booking && bookingEvent(booking);
  if (!booking || !event) notFound();

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
