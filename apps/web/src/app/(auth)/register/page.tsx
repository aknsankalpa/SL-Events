import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = { title: "Create account" };

export default function Page() {
  // The form reads the ?next= link, so it needs a Suspense boundary.
  return (
    <Suspense fallback={<div className="h-64" aria-hidden />}>
      <RegisterForm />
    </Suspense>
  );
}
