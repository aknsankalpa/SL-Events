import type { Metadata } from "next";
import { Suspense } from "react";
import { ProofScreen } from "@/components/booking/screens";

export const metadata: Metadata = { title: "Upload payment proof" };

async function Screen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProofScreen id={id} />;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="h-64" aria-hidden />}>
      <Screen params={params} />
    </Suspense>
  );
}
