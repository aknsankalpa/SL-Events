import type { Metadata } from "next";
import { Suspense } from "react";
import { FaqPage } from "@/components/help/FaqPage";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "FAQ", description: "Answers about booking, payment, tickets, accounts and organizing on SL Events." };

export default function Page() {
  return (
    <>
      <PageHeader title="Frequently asked questions" subtitle="Booking, payment, tickets, your account and organizing events." />
      {/* The list reads the ?cat= link, so it needs a Suspense boundary. */}
      <Suspense fallback={<div className="h-96" aria-hidden />}>
        <FaqPage />
      </Suspense>
    </>
  );
}
