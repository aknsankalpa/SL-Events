"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox, Field, PasswordField } from "@/components/ui/Field";
import { SocialButtons } from "./SocialButtons";

export function LoginForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const next: typeof errors = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = "Enter a valid email address.";
    if (!password) next.password = "Enter your password.";
    setErrors(next);
    // TODO: call the auth API here; for now any valid input "logs in".
    if (Object.keys(next).length === 0) router.push("/");
  }

  return (
    <>
      <h1 className="font-display text-[30px] font-bold text-text">Welcome back</h1>
      <p className="mt-2 text-[13px] text-muted">Log in to see your tickets and book faster.</p>

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
        <Button type="submit" size="lg" className="w-full">
          Log in
        </Button>
      </form>

      <SocialButtons />

      <p className="mt-6 text-center text-xs text-dim">
        New to SL Events?{" "}
        <Link href="/register" className="font-bold text-amber hover:text-gold">
          Create an account
        </Link>
      </p>
    </>
  );
}
