"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox, Field, PasswordField } from "@/components/ui/Field";
import { safeNext } from "@/lib/session";
import { SocialButtons } from "./SocialButtons";
import { auth } from "./useSession";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const found: typeof errors = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) found.email = "Enter a valid email address.";
    if (!password) found.password = "Enter your password.";
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    const result = await auth.login(email, password);
    setBusy(false);
    if (!result.ok) {
      setErrors({ password: result.error ?? "Couldn't log in." });
      return;
    }
    router.push(result.user.verified ? next : `/verify-email?email=${encodeURIComponent(result.user.email)}&next=${encodeURIComponent(next)}`);
  }

  return (
    <>
      <h1 className="font-display text-[30px] font-bold text-text">Log in</h1>
      <p className="mt-2 text-[13px] text-muted">
        {next !== "/" ? "Log in to continue. You'll come straight back." : "See your tickets and book faster."}
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          icon={<Mail />}
          error={errors.email}
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          placeholder="Your password"
          icon={<Lock />}
          error={errors.password}
          labelAction={
            <Link href="/forgot-password" className="text-xs font-bold text-amber hover:text-gold">
              Forgot password?
            </Link>
          }
        />
        <Checkbox name="remember" defaultChecked label="Keep me logged in on this device" />
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? "Logging in…" : "Log in"}
        </Button>
      </form>

      <SocialButtons />

      <p className="mt-6 text-center text-xs text-dim">
        New to SL Events?{" "}
        <Link href={next !== "/" ? `/register?next=${encodeURIComponent(next)}` : "/register"} className="font-bold text-amber hover:text-gold">
          Create an account
        </Link>
      </p>
    </>
  );
}
