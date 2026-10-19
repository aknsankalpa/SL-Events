"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { markVerified, safeNext, signIn } from "@/lib/session";

const RESEND_SECONDS = 30;

/** Confirms the address with the 6-digit code we email. Anyone can also skip and verify later from their profile. */
export function VerifyEmailForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const next = safeNext(params.get("next"));
  const [error, setError] = useState<string>();
  const [wait, setWait] = useState(RESEND_SECONDS);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return (
      <>
        <h1 className="font-display text-[30px] font-bold text-text">Verify your email</h1>
        <p className="mt-3 text-[13px] leading-relaxed text-muted">
          We need to know which address to verify. Create an account or log in first.
        </p>
        <div className="mt-6 flex gap-3">
          <Link href="/register" className="text-sm font-bold text-amber hover:text-gold">
            Create account
          </Link>
          <Link href="/login" className="text-sm font-bold text-amber hover:text-gold">
            Log in
          </Link>
        </div>
      </>
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code") ?? "").replace(/\s/g, "");
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from the email.");
      return;
    }
    setError(undefined);
    // TODO: check the code with the auth API. The mock accepts any 6 digits.
    markVerified(email);
    router.push(next);
  }

  function resend() {
    // TODO: ask the auth API to send a new code.
    setResent(true);
    setWait(RESEND_SECONDS);
  }

  function later() {
    signIn(email);
    router.push(next);
  }

  return (
    <>
      <Link href="/register" className="mb-6 inline-flex items-center gap-2 text-xs font-bold text-muted hover:text-gold">
        <ArrowLeft size={14} aria-hidden /> Back
      </Link>
      <span className="mb-5 flex size-11 items-center justify-center rounded-xl bg-gold/15 text-gold">
        <MailCheck size={20} aria-hidden />
      </span>
      <h1 className="font-display text-[30px] font-bold leading-tight text-text">Check your email</h1>
      <p className="mt-3 text-[13px] leading-relaxed text-muted">
        We sent a 6-digit code to <strong className="text-text">{email}</strong>. Enter it below to confirm your address.
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5">
        <Field
          label="Verification code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          placeholder="123456"
          error={error}
          hint="No real email is sent in this preview: enter any 6 digits."
        />
        <Button type="submit" size="lg" className="w-full">
          Verify email
        </Button>
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <button
          type="button"
          onClick={resend}
          disabled={wait > 0}
          className="font-bold text-amber hover:text-gold disabled:cursor-not-allowed disabled:text-dim"
        >
          {wait > 0 ? `Send a new code in ${wait}s` : "Send a new code"}
        </button>
        <button type="button" onClick={later} className="text-muted underline-offset-2 hover:text-text hover:underline">
          Verify later
        </button>
      </div>
      {resent && (
        <p role="status" className="mt-3 text-xs text-success">
          A new code is on its way.
        </p>
      )}
      <p className="mt-6 text-center text-xs text-dim">
        Nothing after a few minutes? Check your spam folder or{" "}
        <Link href="/contact" className="font-bold text-amber hover:text-gold">
          contact support
        </Link>
        .
      </p>
    </>
  );
}
