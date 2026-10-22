import type { Metadata } from "next";
import { Suspense } from "react";
import { AuditPage } from "@/components/admin/AuditPage";

export const metadata: Metadata = { title: "Audit log" };

export default function Page() {
  // Pages read the link (?tab=...), so they sit inside a Suspense boundary.
  return (
    <Suspense fallback={<div className="h-64" aria-hidden />}>
      <AuditPage />
    </Suspense>
  );
}
