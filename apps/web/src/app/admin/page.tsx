import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardPage } from "@/components/admin/DashboardPage";

export const metadata: Metadata = { title: "Platform overview" };

export default function Page() {
  // Pages read the link (?tab=...), so they sit inside a Suspense boundary.
  return (
    <Suspense fallback={<div className="h-64" aria-hidden />}>
      <DashboardPage />
    </Suspense>
  );
}
