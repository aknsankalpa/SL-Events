import type { Metadata } from "next";
import { Suspense } from "react";
import { EventPreviewScreen } from "@/components/organizer/EventPreviewScreen";

export const metadata: Metadata = { title: "Preview event" };

async function Screen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EventPreviewScreen id={id} />;
}

export default function OrganizerEventPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading preview…</p>}>
      <Screen params={params} />
    </Suspense>
  );
}
