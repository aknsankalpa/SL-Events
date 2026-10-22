import type { Metadata } from "next";
import { Suspense } from "react";
import { EventsPage } from "@/components/admin/EventsPage";

export const metadata: Metadata = { title: "All events" };

export default function Page() {
  // Pages read the link (?tab=...), so they sit inside a Suspense boundary.
  return (
    <Suspense fallback={<div className="h-64" aria-hidden />}>
      <EventsPage />
    </Suspense>
  );
}
