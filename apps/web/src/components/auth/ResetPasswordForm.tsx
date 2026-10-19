"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, KeyRound, Lock } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/Button";
import { PasswordField } from "@/components/ui/Field";

/** The page the reset link in the email opens: choose a new password. */
export function ResetPasswordForm() {
  const params = useSearchParams();
  const email = params.get("email");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [done, setDone] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const password = String(data.get("password") ?? "");
    const found: typeof errors = {};
    if (password.length < 8) found.password = "Use at least 8 characters.";
    if (data.get("confirm") !== password) found.confirm = "Passwords do not match.";
    setErrors(found);
    if (Object.keys(found).length) return;
    // TODO: send the new password and the token from the link to the auth API.
    setDone(true);
  }

  if (done) {
    return (
      <>
        <span className="mb-5 flex size-11 items-center justify-center rounded-xl bg-success/15 text-success">
          <CheckCircle2 size={20} aria-hidden />
        </span>
        <h1 className="font-display text-[30px] font-bold leading-tight text-text">Password updated</h1>
        <p className="mt-3 text-[13px] leading-relaxed text-muted">You can now log in with your new password.</p>
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
        {email ? (
          <>
            For <strong className="text-text">{email}</strong>. Reset links work for 30 minutes.
          </>
        ) : (
          "Reset links work for 30 minutes."
        )}
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5">
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
        <Button type="submit" size="lg" className="w-full">
          Update password
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-dim">
        Link expired?{" "}
        <Link href="/forgot-password" className="font-bold text-amber hover:text-gold">
          Send a new one
        </Link>
      </p>
    </>
  );
}
