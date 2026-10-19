import type { Metadata } from "next";
import { Suspense } from "react";
import { ApplicationStatus } from "@/components/organizer-apply/ApplicationStatus";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Application status" };

export default function ApplicationStatusPage() {
  return (
    <>
      <PageHeader title="Application status" subtitle="See where your organizer application is in the review." />
      <div className="mx-auto max-w-2xl px-5 py-10">
        {/* The status view reads the link's reference and email, so it needs a Suspense boundary. */}
        <Suspense fallback={<div className="h-48" aria-hidden />}>
          <ApplicationStatus />
        </Suspense>
      </div>
    </>
  );
}
