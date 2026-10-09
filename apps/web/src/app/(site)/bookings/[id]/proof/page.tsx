import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProofUploadForm } from "@/components/booking/ProofUploadForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Stepper } from "@/components/ui/Stepper";
import { bookingEvent, bookings, getBooking } from "@/lib/bookings";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Upload payment proof" };

export function generateStaticParams() {
  return bookings.filter((b) => b.eventSlug).map((b) => ({ id: b.id }));
}

export default async function ProofPage({ params }: Props) {
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
        title="Upload payment proof"
        subtitle="Add a screenshot of your transfer so we can confirm your booking."
      >
        <Stepper current={4} />
      </PageHeader>
      <ProofUploadForm booking={booking} event={event} />
    </>
  );
}
