import type { Metadata } from "next";
import { Suspense } from "react";
import { TicketsScreen } from "@/components/booking/screens";

export const metadata: Metadata = { title: "QR tickets" };

async function Screen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TicketsScreen id={id} />;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="h-64" aria-hidden />}>
      <Screen params={params} />
    </Suspense>
  );
}
