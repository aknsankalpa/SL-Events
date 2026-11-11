"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { safeNext } from "@/lib/session";
import { auth, devCodes } from "./useSession";

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
  const [busy, setBusy] = useState(false);
  // Emails aren't sent yet, so while developing the code is shown here (the server also prints it in its terminal).
  const [devCode, setDevCode] = useState<string | null>(null);

  useEffect(() => {
    // Read once after the page appears: sessionStorage isn't available while rendering on the server.
    const id = setTimeout(() => setDevCode(devCodes.read()), 0);
    return () => clearTimeout(id);
  }, []);

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

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code") ?? "").replace(/\s/g, "");
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from the email.");
      return;
    }
    setError(undefined);
    setBusy(true);
    const result = await auth.verifyEmail(email, code);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "That code isn't right.");
      return;
    }
    router.push(next);
  }

  async function resend() {
    setResent(false);
    setWait(RESEND_SECONDS);
    const result = await auth.resendCode(email);
    if (result.ok) {
      setResent(true);
      if (result.devCode) {
        devCodes.save(result.devCode);
        setDevCode(result.devCode);
      }
    } else setError(result.error);
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

      {devCode && (
        <p role="status" className="mt-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-xs leading-relaxed text-text">
          Development only: emails aren&apos;t sent yet. Your code is <strong className="font-mono text-gold">{devCode}</strong>.
        </p>
      )}

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5">
        <Field
          label="Verification code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          placeholder="123456"
          error={error}
        />
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? "Checking…" : "Verify email"}
        </Button>
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <button
          type="button"
          onClick={() => void resend()}
          disabled={wait > 0}
          className="font-bold text-amber hover:text-gold disabled:cursor-not-allowed disabled:text-dim"
        >
          {wait > 0 ? `Send a new code in ${wait}s` : "Send a new code"}
        </button>
        {/* The account is already signed in; verifying can wait until later. */}
        <button type="button" onClick={() => router.push(next)} className="text-muted underline-offset-2 hover:text-text hover:underline">
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
