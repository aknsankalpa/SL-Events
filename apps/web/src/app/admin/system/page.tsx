import type { Metadata } from "next";
import { Suspense } from "react";
import { SystemPage } from "@/components/admin/SystemPage";

export const metadata: Metadata = { title: "System operations" };

export default function Page() {
  // Pages read the link (?tab=...), so they sit inside a Suspense boundary.
  return (
    <Suspense fallback={<div className="h-64" aria-hidden />}>
      <SystemPage />
    </Suspense>
  );
}
