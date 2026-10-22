import type { Metadata } from "next";
import { Suspense } from "react";
import { OrganizersPage } from "@/components/admin/OrganizersPage";

export const metadata: Metadata = { title: "Organizer approval" };

export default function Page() {
  // Pages read the link (?tab=...), so they sit inside a Suspense boundary.
  return (
    <Suspense fallback={<div className="h-64" aria-hidden />}>
      <OrganizersPage />
    </Suspense>
  );
}
