import type { Metadata } from "next";
import { Suspense } from "react";
import { ReceiptScreen } from "@/components/booking/screens";

export const metadata: Metadata = { title: "Booking confirmation" };

async function Screen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReceiptScreen id={id} />;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="h-64" aria-hidden />}>
      <Screen params={params} />
    </Suspense>
  );
}
