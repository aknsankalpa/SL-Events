"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lock, Mail, MapPin, Phone, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox, Field, PasswordField, SelectField } from "@/components/ui/Field";
import { cities } from "@/lib/data";
import { SocialButtons } from "./SocialButtons";

type Errors = Partial<Record<"name" | "email" | "phone" | "password" | "confirm" | "terms", string>>;

export function RegisterForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<Errors>({});

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const get = (key: string) => String(data.get(key) ?? "").trim();
    const password = String(data.get("password") ?? "");

    const next: Errors = {};
    if (!get("name")) next.name = "Enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(get("email"))) next.email = "Enter a valid email address.";
    if (!/^[0-9+\-\s]{9,15}$/.test(get("phone"))) next.phone = "Enter a valid mobile number.";
    if (password.length < 8) next.password = "Use at least 8 characters.";
    if (data.get("confirm") !== password) next.confirm = "Passwords do not match.";
    if (!data.get("terms")) next.terms = "You need to accept the terms to continue.";
    setErrors(next);
    // TODO: call the registration API; then route to email verification.
    if (Object.keys(next).length === 0) router.push("/");
  }

  return (
    <>
      <h1 className="font-display text-[30px] font-bold text-text">Create your account</h1>
      <p className="mt-2 text-[13px] text-muted">It takes a minute. You&apos;ll use it to book and keep your tickets.</p>

      <form onSubmit={onSubmit} noValidate className="mt-7 space-y-5">
        <Field label="Full name" name="name" autoComplete="name" placeholder="Your full name" icon={<User />} error={errors.name} />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Email" name="email" type="email" autoComplete="email" placeholder="Email address" icon={<Mail />} error={errors.email} />
          <Field label="Mobile number" name="phone" type="tel" autoComplete="tel" placeholder="010-0000-0000" icon={<Phone />} error={errors.phone} />
        </div>

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

        <SelectField label="City you live in" name="city" defaultValue="Seoul" icon={<MapPin />} hint="We use this to show events near you.">
          {cities.map((c) => (
            <option key={c} value={c} className="bg-surface">
              {c}
            </option>
          ))}
        </SelectField>

        <div className="space-y-3">
          <Checkbox
            name="terms"
            label={
              <>
                I agree to the{" "}
                <Link href="/terms" className="text-text underline-offset-2 hover:underline">
                  Terms of use
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
          <Checkbox name="news" label="Send me news about Sri Lankan events in Korea. (Optional)" />
        </div>

        <Button type="submit" size="lg" className="w-full">
          Create account
        </Button>
      </form>

      <SocialButtons />

      <p className="mt-6 text-center text-xs text-dim">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-amber hover:text-gold">
          Log in
        </Link>
      </p>
    </>
  );
}
