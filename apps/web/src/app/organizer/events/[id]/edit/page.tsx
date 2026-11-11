import type { Metadata } from "next";
import { Suspense } from "react";
import { EventEditor } from "@/components/organizer/EventEditor";

export const metadata: Metadata = { title: "Edit event" };

async function Editor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EventEditor id={id} />;
}

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading event…</p>}>
      <Editor params={params} />
    </Suspense>
  );
}
