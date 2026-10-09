import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BookingSummaryForm } from "@/components/booking/BookingSummaryForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Stepper } from "@/components/ui/Stepper";
import { events, getEvent } from "@/lib/data";

type Props = { params: Promise<{ slug: string }> };

export const metadata: Metadata = { title: "Review your booking" };

export function generateStaticParams() {
  return events.map((e) => ({ slug: e.slug }));
}

export default async function BookingSummaryPage({ params }: Props) {
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
        title="Review your booking"
      >
        <Stepper current={2} />
      </PageHeader>
      <Suspense fallback={<div className="mx-auto max-w-site px-5 py-10 text-sm text-muted">Loading…</div>}>
        <BookingSummaryForm event={event} />
      </Suspense>
    </>
  );
}
