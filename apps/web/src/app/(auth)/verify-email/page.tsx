import type { Metadata } from "next";
import { Suspense } from "react";
import { VerifyEmailForm } from "@/components/auth/VerifyEmailForm";

export const metadata: Metadata = { title: "Verify your email" };

export default function Page() {
  // The form reads the ?next= link, so it needs a Suspense boundary.
  return (
    <Suspense fallback={<div className="h-64" aria-hidden />}>
      <VerifyEmailForm />
    </Suspense>
  );
}
