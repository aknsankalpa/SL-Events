"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Clock, KeyRound, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { auth, devCodes, useSession } from "./useSession";

const steps = [
  { Icon: Mail, text: "We email you a 6-digit code" },
  { Icon: Clock, text: "Use it within 15 minutes" },
  { Icon: Lock, text: "Choose a new password and log in" },
];

export function ForgotPasswordForm() {
  // A signed-in person changing their password gets their own email filled in.
  const { user } = useSession();
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter the email you signed up with.");
      return;
    }
    setError(undefined);
    setBusy(true);
    const result = await auth.forgotPassword(email);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    // The answer is the same whether or not the email has an account, so nobody can use this to check emails.
    devCodes.save(result.devCode);
    router.push(`/reset-password?email=${encodeURIComponent(email)}`);
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
        Enter the email you signed up with. We&apos;ll send you a code to choose a new password.
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5">
        <Field
          key={user?.email ?? ""}
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          defaultValue={user?.email ?? ""}
          icon={<Mail />}
          error={error}
        />
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? "Sending…" : "Send reset code"}
        </Button>
      </form>

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
