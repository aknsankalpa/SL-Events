import type { Metadata } from "next";
import { Suspense } from "react";
import { SettingsPage } from "@/components/admin/SettingsPage";

export const metadata: Metadata = { title: "Platform configuration" };

export default function Page() {
  // Pages read the link (?tab=...), so they sit inside a Suspense boundary.
  return (
    <Suspense fallback={<div className="h-64" aria-hidden />}>
      <SettingsPage />
    </Suspense>
  );
}
