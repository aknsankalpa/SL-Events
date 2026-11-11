"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, Hash, KeyRound, Lock, Mail } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/Button";
import { Field, PasswordField } from "@/components/ui/Field";
import { auth, devCodes } from "./useSession";

type Errors = Partial<Record<"email" | "code" | "password" | "confirm", string>>;

/** Choose a new password with the 6-digit code from the email. */
export function ResetPasswordForm() {
  const params = useSearchParams();
  const emailParam = params.get("email") ?? "";
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string>();
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);

  useEffect(() => {
    // Read once after the page appears: sessionStorage isn't available while rendering on the server.
    const id = setTimeout(() => setDevCode(devCodes.read()), 0);
    return () => clearTimeout(id);
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? emailParam).trim();
    const code = String(data.get("code") ?? "").replace(/\s/g, "");
    const password = String(data.get("password") ?? "");
    const found: Errors = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) found.email = "Enter the email you signed up with.";
    if (!/^\d{6}$/.test(code)) found.code = "Enter the 6-digit code from the email.";
    if (password.length < 8) found.password = "Use at least 8 characters.";
    if (data.get("confirm") !== password) found.confirm = "Passwords do not match.";
    setErrors(found);
    setFormError(undefined);
    if (Object.keys(found).length) return;

    setBusy(true);
    const result = await auth.resetPassword(email, code, password);
    setBusy(false);
    if (!result.ok) {
      setErrors((cur) => ({ ...cur, ...result.errors }));
      setFormError(result.error);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <>
        <span className="mb-5 flex size-11 items-center justify-center rounded-xl bg-success/15 text-success">
          <CheckCircle2 size={20} aria-hidden />
        </span>
        <h1 className="font-display text-[30px] font-bold leading-tight text-text">Password updated</h1>
        <p className="mt-3 text-[13px] leading-relaxed text-muted">
          You can now log in with your new password. For your safety, every other device was signed out.
        </p>
        <LinkButton href="/login" size="lg" className="mt-6 w-full">
          Log in
        </LinkButton>
      </>
    );
  }

  return (
    <>
      <span className="mb-5 flex size-11 items-center justify-center rounded-xl bg-gold/15 text-gold">
        <KeyRound size={20} aria-hidden />
      </span>
      <h1 className="font-display text-[30px] font-bold leading-tight text-text">Choose a new password</h1>
      <p className="mt-3 text-[13px] leading-relaxed text-muted">
        {emailParam ? (
          <>
            We sent a 6-digit code to <strong className="text-text">{emailParam}</strong>. It works for 15 minutes.
          </>
        ) : (
          "Enter your email and the 6-digit code we sent you. Codes work for 15 minutes."
        )}
      </p>

      {devCode && (
        <p role="status" className="mt-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-xs leading-relaxed text-text">
          Development only: emails aren&apos;t sent yet. Your code is <strong className="font-mono text-gold">{devCode}</strong>.
        </p>
      )}

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5">
        {emailParam ? (
          <input type="hidden" name="email" value={emailParam} />
        ) : (
          <Field label="Email" name="email" type="email" autoComplete="email" placeholder="you@example.com" icon={<Mail />} error={errors.email} />
        )}
        <Field
          label="Code from the email"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          placeholder="123456"
          icon={<Hash />}
          error={errors.code}
        />
        <PasswordField
          label="New password"
          name="password"
          autoComplete="new-password"
          placeholder="New password"
          icon={<Lock />}
          hint="At least 8 characters."
          error={errors.password}
        />
        <PasswordField
          label="Confirm new password"
          name="confirm"
          autoComplete="new-password"
          placeholder="Confirm"
          icon={<Lock />}
          error={errors.confirm}
        />
        {formError && (
          <p role="alert" className="text-xs text-danger">
            {formError}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? "Updating…" : "Update password"}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-dim">
        Code expired?{" "}
        <Link href="/forgot-password" className="font-bold text-amber hover:text-gold">
          Send a new one
        </Link>
      </p>
    </>
  );
}
