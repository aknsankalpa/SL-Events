import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderScreen } from "@/components/booking/screens";

export const metadata: Metadata = { title: "Order details" };

async function Screen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderScreen id={id} />;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="h-64" aria-hidden />}>
      <Screen params={params} />
    </Suspense>
  );
}
