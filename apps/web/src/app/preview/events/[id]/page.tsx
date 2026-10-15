import type { Metadata } from "next";
import { Suspense } from "react";
import { DraftPreview } from "@/components/organizer/DraftPreview";

export const metadata: Metadata = { title: "Event preview", robots: { index: false, follow: false } };

async function Preview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DraftPreview id={id} />;
}

/** Just the event advertisement, with no site header or footer. It lives outside the customer layout on purpose. */
export default function EventPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="min-h-screen bg-page">
      <Suspense fallback={<div className="mx-auto max-w-site px-5 py-16 text-sm text-muted">Loading preview…</div>}>
        <Preview params={params} />
      </Suspense>
    </main>
  );
}
