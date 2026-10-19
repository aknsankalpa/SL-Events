"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, Clock, KeyRound, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

const steps = [
  { Icon: Mail, text: "We email you a reset link" },
  { Icon: Clock, text: "Open it within 30 minutes" },
  { Icon: Lock, text: "Choose a new password and log in" },
];

export function ForgotPasswordForm() {
  const [error, setError] = useState<string>();
  const [sentTo, setSentTo] = useState<string>();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter the email you signed up with.");
      return;
    }
    setError(undefined);
    // TODO: call the password-reset API.
    setSentTo(email);
  }

  return (
    <>
      <Link href="/login" className="mb-6 inline-flex items-center gap-2 text-xs font-bold text-muted hover:text-gold">
        <ArrowLeft size={14} aria-hidden /> Back to log in
      </Link>

      <span className="mb-5 flex size-11 items-center justify-center rounded-xl bg-gold/15 text-gold">
        <KeyRound size={20} aria-hidden />
      </span>
      <h1 className="font-display text-[30px] font-bold leading-tight text-text">Forgot your password?</h1>
      <p className="mt-3 text-[13px] leading-relaxed text-muted">
        Enter the email you signed up with. We&apos;ll send you a link to choose a new password.
      </p>

      {sentTo ? (
        <div role="status" className="mt-6 flex items-start gap-3 rounded-lg border border-success/40 bg-success/10 p-4 text-sm text-text">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success" aria-hidden />
          <div>
            <p>
              If an account exists for <strong>{sentTo}</strong>, a reset link is on its way.
            </p>
            {/* No real email is sent yet; this stands in for clicking the link in it. */}
            <Link href={`/reset-password?email=${encodeURIComponent(sentTo)}`} className="mt-2 inline-block text-xs font-bold text-amber hover:text-gold">
              Open the reset link (preview)
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5">
          <Field label="Email" name="email" type="email" autoComplete="email" placeholder="you@example.com" icon={<Mail />} error={error} />
          <Button type="submit" size="lg" className="w-full">
            Send reset link
          </Button>
        </form>
      )}

      <section className="mt-6 rounded-xl border border-line bg-surface p-5">
        <h2 className="mb-4 text-[11px] font-bold uppercase tracking-wider text-muted">What happens next</h2>
        <ol className="space-y-3">
          {steps.map(({ Icon, text }, i) => (
            <li key={text} className="flex items-center gap-3 text-[13px] text-text">
              <span className="w-3 font-display text-sm font-bold text-amber">{i + 1}</span>
              <Icon size={16} className="text-muted" aria-hidden />
              {text}
            </li>
          ))}
        </ol>
      </section>

      <p className="mt-6 text-center text-xs text-dim">
        No email after 5 minutes? Check spam or{" "}
        <Link href="/help" className="font-bold text-amber hover:text-gold">
          contact support
        </Link>
      </p>
    </>
  );
}
