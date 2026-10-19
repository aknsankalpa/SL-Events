import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ContactChannels } from "@/components/help/ContactChannels";
import { ContactForm } from "@/components/help/ContactForm";
import { SupportRequests } from "@/components/help/SupportRequests";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Contact and support", description: "Write to the SL Events team. We reply every day." };

export default function ContactPage() {
  return (
    <>
      <PageHeader title="Contact and support" subtitle="Questions about a booking, a payment or your account? Write to us and we'll reply by email." />
      <div className="mx-auto grid max-w-site items-start gap-8 px-5 py-10 lg:grid-cols-[1fr_22rem]">
        <Card className="p-6 sm:p-8">
          <h2 className="mb-5 text-lg font-bold text-text">Send a message</h2>
          <Suspense fallback={<div className="h-72" aria-hidden />}>
            <ContactForm />
          </Suspense>
        </Card>

        <aside className="space-y-5">
          <SupportRequests />
          <Card className="p-6">
            <h2 className="mb-5 text-base font-bold text-text">Ways to reach us</h2>
            <ContactChannels />
          </Card>
          <Card className="p-6">
            <h2 className="text-base font-bold text-text">Before you write</h2>
            <ul className="mt-3 space-y-2.5 text-[13px] text-muted">
              <li>
                <Link href="/faq" className="font-bold text-amber hover:text-gold">
                  FAQ
                </Link>{" "}
                answers most booking and account questions.
              </li>
              <li>
                <Link href="/payment-instructions" className="font-bold text-amber hover:text-gold">
                  Payment instructions
                </Link>{" "}
                explain bank transfers step by step.
              </li>
              <li>
                Applied to organize?{" "}
                <Link href="/become-an-organizer/status" className="font-bold text-amber hover:text-gold">
                  Check your application
                </Link>
                .
              </li>
            </ul>
          </Card>
        </aside>
      </div>
    </>
  );
}
