"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Lock, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox, Field, PasswordField } from "@/components/ui/Field";
import { accountExists, registerAccount, safeNext } from "@/lib/session";
import { SocialButtons } from "./SocialButtons";

type Errors = Partial<Record<"name" | "email" | "password" | "confirm" | "terms", string>>;

/** Four fields and a checkbox. Nothing country-specific: a name, an email and a password are enough. */
export function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [errors, setErrors] = useState<Errors>({});

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const get = (key: string) => String(data.get(key) ?? "").trim();
    const password = String(data.get("password") ?? "");

    const found: Errors = {};
    if (!get("name")) found.name = "Enter your name.";
    if (!/^\S+@\S+\.\S+$/.test(get("email"))) found.email = "Enter a valid email address.";
    else if (accountExists(get("email"))) found.email = "There is already an account with this email. Log in instead.";
    if (password.length < 8) found.password = "Use at least 8 characters.";
    if (data.get("confirm") !== password) found.confirm = "Passwords do not match.";
    if (!data.get("terms")) found.terms = "You need to accept the terms to continue.";
    setErrors(found);
    if (Object.keys(found).length) return;

    // TODO: call the registration API, which emails the verification code.
    registerAccount(get("name"), get("email"));
    router.push(`/verify-email?email=${encodeURIComponent(get("email"))}&next=${encodeURIComponent(next)}`);
  }

  return (
    <>
      <h1 className="font-display text-[30px] font-bold text-text">Create your account</h1>
      <p className="mt-2 text-[13px] text-muted">It takes a minute. You&apos;ll use it to book and keep your tickets.</p>

      <form onSubmit={onSubmit} noValidate className="mt-7 space-y-5">
        <Field label="Name" name="name" autoComplete="name" placeholder="Your name" icon={<User />} error={errors.name} />
        <Field label="Email" name="email" type="email" autoComplete="email" placeholder="you@example.com" icon={<Mail />} error={errors.email} />

        <div className="grid gap-5 sm:grid-cols-2">
          <PasswordField
            label="Password"
            name="password"
            autoComplete="new-password"
            placeholder="Password"
            icon={<Lock />}
            hint="At least 8 characters."
            error={errors.password}
          />
          <PasswordField
            label="Confirm password"
            name="confirm"
            autoComplete="new-password"
            placeholder="Confirm"
            icon={<Lock />}
            error={errors.confirm}
          />
        </div>

        <div className="space-y-3">
          <Checkbox
            name="terms"
            label={
              <>
                I agree to the{" "}
                <Link href="/terms" className="text-text underline-offset-2 hover:underline">
                  Terms and conditions
                </Link>{" "}
                and the{" "}
                <Link href="/privacy" className="text-text underline-offset-2 hover:underline">
                  Privacy policy
                </Link>
                . (Required)
              </>
            }
          />
          {errors.terms && <p className="text-xs text-danger">{errors.terms}</p>}
          <Checkbox name="news" label="Send me news about upcoming events. (Optional)" />
        </div>

        <Button type="submit" size="lg" className="w-full">
          Create account
        </Button>
        <p className="text-center text-[11px] text-dim">We&apos;ll email you a code to confirm your address.</p>
      </form>

      <SocialButtons />

      <p className="mt-6 text-center text-xs text-dim">
        Already have an account?{" "}
        <Link href={next !== "/" ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-bold text-amber hover:text-gold">
          Log in
        </Link>
      </p>
    </>
  );
}
