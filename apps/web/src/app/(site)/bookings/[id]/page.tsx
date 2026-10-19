import type { Metadata } from "next";
import { Suspense } from "react";
import { StatusScreen } from "@/components/booking/screens";

export const metadata: Metadata = { title: "Payment status" };

async function Screen({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ submitted?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return <StatusScreen id={id} justSubmitted={query.submitted === "1"} />;
}

export default function Page(props: { params: Promise<{ id: string }>; searchParams: Promise<{ submitted?: string }> }) {
  return (
    <Suspense fallback={<div className="h-64" aria-hidden />}>
      <Screen {...props} />
    </Suspense>
  );
}
