import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ClipboardList, MailCheck, Search, Store } from "lucide-react";
import { ApplicationForm } from "@/components/organizer-apply/ApplicationForm";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = {
  title: "Become an organizer",
  description: "Apply to sell tickets for your events on SL Events.",
};

const steps = [
  { Icon: ClipboardList, title: "Apply", body: "Fill in the short form. It takes about five minutes." },
  { Icon: Search, title: "We review", body: "A member of our team reads it within 2 working days and may ask a question by email." },
  { Icon: MailCheck, title: "You hear from us", body: "We email the decision. Approved organizers can log in and create their first event." },
];

const looksFor = [
  "A real group, business or person we can contact by email",
  "A clear idea of the events you want to run",
  "Somewhere we can see your past events, if you have them (optional)",
];

export default function BecomeAnOrganizerPage() {
  return (
    <>
      <PageHeader
        title="Become an organizer"
        subtitle="Sell tickets to the community, check people in with QR codes and see your sales in one place."
      />
      <div className="mx-auto grid max-w-site items-start gap-8 px-5 py-10 lg:grid-cols-[1fr_22rem]">
        <Card className="p-6 sm:p-8">
          <ApplicationForm />
        </Card>

        <aside className="space-y-5 lg:sticky lg:top-[108px]">
          <Card className="p-6">
            <h2 className="flex items-center gap-2 text-base font-bold text-text">
              <Store size={16} aria-hidden className="text-gold" /> What happens next
            </h2>
            <ol className="mt-5 space-y-5">
              {steps.map(({ Icon, title, body }, i) => (
                <li key={title} className="flex gap-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold">
                    <Icon size={16} aria-hidden />
                  </span>
                  <span className="leading-snug">
                    <span className="block text-[13px] font-bold text-text">
                      {i + 1}. {title}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted">{body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Card>

          <Card className="p-6">
            <h2 className="text-base font-bold text-text">What we look for</h2>
            <ul className="mt-4 space-y-3">
              {looksFor.map((t) => (
                <li key={t} className="flex gap-3 text-[13px] leading-relaxed text-muted">
                  <CheckCircle2 size={16} aria-hidden className="mt-0.5 shrink-0 text-amber" />
                  {t}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-6">
            <h2 className="text-base font-bold text-text">Already applied?</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">Use your reference and email to see where your application is.</p>
            <Link href="/become-an-organizer/status" className="mt-4 inline-block text-sm font-bold text-amber hover:text-gold">
              Check application status
            </Link>
          </Card>
        </aside>
      </div>
    </>
  );
}
