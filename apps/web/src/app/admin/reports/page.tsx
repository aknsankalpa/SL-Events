import type { Metadata } from "next";
import { Suspense } from "react";
import { ReportsPage } from "@/components/admin/ReportsPage";

export const metadata: Metadata = { title: "Reports and analytics" };

export default function Page() {
  // Pages read the link (?tab=...), so they sit inside a Suspense boundary.
  return (
    <Suspense fallback={<div className="h-64" aria-hidden />}>
      <ReportsPage />
    </Suspense>
  );
}
