import type { Metadata } from "next";
import { Suspense } from "react";
import { PaymentsPage } from "@/components/admin/PaymentsPage";

export const metadata: Metadata = { title: "Payments and reconciliation" };

export default function Page() {
  // Pages read the link (?tab=...), so they sit inside a Suspense boundary.
  return (
    <Suspense fallback={<div className="h-64" aria-hidden />}>
      <PaymentsPage />
    </Suspense>
  );
}
