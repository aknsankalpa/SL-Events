import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Log in" };

export default function Page() {
  // The form reads the ?next= link, so it needs a Suspense boundary.
  return (
    <Suspense fallback={<div className="h-64" aria-hidden />}>
      <LoginForm />
    </Suspense>
  );
}
