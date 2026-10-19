import type { Metadata } from "next";
import Link from "next/link";
import { Camera, CheckCircle2, Clock, Landmark, QrCode, Ticket, Upload } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { paymentAccount } from "@/lib/data";

export const metadata: Metadata = {
  title: "Payment instructions",
  description: "How to pay for tickets by bank transfer and get your QR tickets.",
};

const steps = [
  { Icon: Ticket, title: "Choose your tickets", body: "Pick an event and your tickets, then review the order and confirm. You'll get a booking number like SL-41730." },
  {
    Icon: Landmark,
    title: "Send the bank transfer",
    body: "In your banking app, transfer the exact total to the account below. Write your booking number as the reference or memo so we can match it.",
  },
  { Icon: Camera, title: "Take a screenshot", body: "Capture the confirmation screen from your bank. Make sure the amount, date and sender name can be read." },
  { Icon: Upload, title: "Upload it to your booking", body: "Open your booking, add the screenshot and the sender's name, and send it." },
  { Icon: QrCode, title: "Get your QR tickets", body: "We check the payment, usually within 2–6 hours. Your QR tickets then appear in My tickets and we email you." },
];

const goodToKnow = [
  { Icon: Clock, text: "Your tickets are held for 24 hours. Transfer and upload your proof within that time." },
  { Icon: CheckCircle2, text: "We check payments every day from 9 AM to 10 PM Korea time (KST). Late proofs are checked the next morning." },
  { Icon: CheckCircle2, text: "Pay the exact total. If the amount is wrong, send the difference with the same reference and upload both screenshots." },
  { Icon: CheckCircle2, text: "A friend can pay for you. Put the sender's name on the proof so we can match it to your booking." },
];

export default function PaymentInstructionsPage() {
  return (
    <>
      <PageHeader title="Payment instructions" subtitle="Tickets are paid by bank transfer. Here's how it works, start to finish." />
      <div className="mx-auto grid max-w-site items-start gap-8 px-5 py-10 lg:grid-cols-[1fr_22rem]">
        <section aria-label="Steps">
          <ol className="space-y-4">
            {steps.map(({ Icon, title, body }, i) => (
              <li key={title} className="flex gap-4 rounded-xl border border-line bg-surface p-5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold">
                  <Icon size={18} aria-hidden />
                </span>
                <span className="leading-snug">
                  <span className="block text-[15px] font-bold text-text">
                    <span className="mr-2 font-display text-amber">{i + 1}</span>
                    {title}
                  </span>
                  <span className="mt-1.5 block text-[13px] leading-relaxed text-muted">{body}</span>
                </span>
              </li>
            ))}
          </ol>

          <h2 className="mb-4 mt-10 text-lg font-bold text-text">Good to know</h2>
          <ul className="space-y-3">
            {goodToKnow.map(({ Icon, text }) => (
              <li key={text} className="flex gap-3 text-[13px] leading-relaxed text-muted">
                <Icon size={16} aria-hidden className="mt-0.5 shrink-0 text-amber" />
                {text}
              </li>
            ))}
          </ul>
        </section>

        <aside className="space-y-5 lg:sticky lg:top-[108px]">
          <Card className="p-6">
            <h2 className="text-base font-bold text-text">Transfer to</h2>
            <dl className="mt-4 space-y-3 text-[13px]">
              {[
                ["Bank", paymentAccount.bank],
                ["Account number", paymentAccount.number],
                ["Account holder", paymentAccount.holder],
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-4">
                  <dt className="text-dim">{k}</dt>
                  <dd className="text-right font-bold text-text">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 border-t border-line pt-4 text-[11px] leading-relaxed text-dim">
              Your exact total and booking number are shown again on the payment screen after you book. Always use those.
            </p>
          </Card>
          <Card className="p-6">
            <h2 className="text-base font-bold text-text">Need help paying?</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              Read the{" "}
              <Link href="/faq?cat=booking" className="font-bold text-amber hover:text-gold">
                booking and payment FAQ
              </Link>{" "}
              or write to us with your booking number.
            </p>
            <LinkButton href="/contact" variant="outline" size="sm" className="mt-4">
              Contact support
            </LinkButton>
          </Card>
        </aside>
      </div>
    </>
  );
}
