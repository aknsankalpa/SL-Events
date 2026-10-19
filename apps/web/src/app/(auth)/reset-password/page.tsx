import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = { title: "Choose a new password" };

export default function Page() {
  // The form reads the ?next= link, so it needs a Suspense boundary.
  return (
    <Suspense fallback={<div className="h-64" aria-hidden />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
