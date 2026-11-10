import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BookingSummaryForm } from "@/components/booking/BookingSummaryForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Stepper } from "@/components/ui/Stepper";
import { getEventBySlug, listEventSlugs } from "@/server/events";

type Props = { params: Promise<{ slug: string }> };

export const metadata: Metadata = { title: "Review your booking" };

export async function generateStaticParams() {
  return (await listEventSlugs()).map((slug) => ({ slug }));
}

async function SummaryContent({ params }: Props) {
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
        title="Review your booking"
      >
        <Stepper current={2} />
      </PageHeader>
      {/* The form reads the chosen tickets or seats from the link, so it waits for the request. */}
      <Suspense fallback={<div className="mx-auto max-w-site px-5 py-10 text-sm text-muted">Loading…</div>}>
        <BookingSummaryForm event={event} />
      </Suspense>
    </>
  );
}

export default function BookingSummaryPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="mx-auto min-h-[60vh] max-w-site px-5 py-10 text-sm text-muted">Loading…</div>}>
      <SummaryContent params={params} />
    </Suspense>
  );
}
