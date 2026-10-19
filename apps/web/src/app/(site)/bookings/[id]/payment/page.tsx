import type { Metadata } from "next";
import { Suspense } from "react";
import { PaymentScreen } from "@/components/booking/screens";

export const metadata: Metadata = { title: "Pay by bank transfer" };

async function Screen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PaymentScreen id={id} />;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="h-64" aria-hidden />}>
      <Screen params={params} />
    </Suspense>
  );
}
