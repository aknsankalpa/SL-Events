import type { Metadata } from "next";
import { Suspense } from "react";
import { OperationsPage } from "@/components/organizer/operations/OperationsPage";

export const metadata: Metadata = { title: "Event operations" };

async function Operations({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OperationsPage id={id} />;
}

export default function OrganizerEventOperationsPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading event…</p>}>
      <Operations params={params} />
    </Suspense>
  );
}
