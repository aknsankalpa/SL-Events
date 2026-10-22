import type { Metadata } from "next";
import { Suspense } from "react";
import { ContentPage } from "@/components/admin/ContentPage";

export const metadata: Metadata = { title: "Notifications and content" };

export default function Page() {
  // Pages read the link (?tab=...), so they sit inside a Suspense boundary.
  return (
    <Suspense fallback={<div className="h-64" aria-hidden />}>
      <ContentPage />
    </Suspense>
  );
}
