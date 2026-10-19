"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Paperclip } from "lucide-react";
import { useSession } from "@/components/auth/useSession";
import { Button } from "@/components/ui/Button";
import { Field, SelectField } from "@/components/ui/Field";
import { submitSupportRequest } from "@/lib/supportRequests";

const topics = ["Booking & payment", "Tickets & QR codes", "Account & login", "Organizer application", "Something else"];

type Errors = Partial<Record<"name" | "email" | "message", string>>;

/** The support form. Works for visitors and customers; a signed-in customer's name and email are filled in. */
export function ContactForm() {
  const { user } = useSession();
  const params = useSearchParams();
  const prefillBooking = params.get("booking") ?? "";
  const [errors, setErrors] = useState<Errors>({});
  const [file, setFile] = useState<string>();
  const [sentTo, setSentTo] = useState<string>();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const get = (k: string) => String(data.get(k) ?? "").trim();
    const found: Errors = {};
    if (!get("name")) found.name = "Enter your name.";
    if (!/^\S+@\S+\.\S+$/.test(get("email"))) found.email = "Enter an email address we can reply to.";
    if (get("message").length < 10) found.message = "Tell us a little more so we can help.";
    setErrors(found);
    if (Object.keys(found).length) return;
    // TODO: POST the message (and any attachment) to the support API.
    const request = submitSupportRequest({ email: get("email"), topic: get("topic"), booking: get("booking"), message: get("message") });
    setSentTo(`${get("email")} (reference ${request.id})`);
  }

  if (sentTo) {
    return (
      <p role="status" className="rounded-lg border border-success/40 bg-success/10 p-4 text-sm leading-relaxed text-text">
        Thanks, we&apos;ve got your message. We&apos;ll reply to <strong>{sentTo}</strong>, every day between 9 AM and 10 PM Korea time (KST).
      </p>
    );
  }

  return (
    // Keyed on the signed-in email so the filled-in details update if someone logs in while the form is open.
    <form key={user?.email ?? "visitor"} onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" name="name" autoComplete="name" defaultValue={user?.name ?? ""} error={errors.name} />
        <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={user?.email ?? ""} error={errors.email} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Topic" name="topic" defaultValue={prefillBooking ? "Booking & payment" : undefined}>
          {topics.map((t) => (
            <option key={t} className="bg-surface">
              {t}
            </option>
          ))}
        </SelectField>
        <Field label="Booking number (optional)" name="booking" defaultValue={prefillBooking} placeholder="SL-41698" />
      </div>
      <div>
        <label htmlFor="message" className="mb-2 block text-xs font-bold text-muted">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          aria-invalid={errors.message ? true : undefined}
          placeholder="Tell us what happened"
          className={`w-full resize-none rounded-lg border bg-surface p-4 text-sm text-text placeholder:text-dim focus:border-gold focus:outline-none ${
            errors.message ? "border-danger" : "border-line"
          }`}
        />
        {errors.message && <p className="mt-1.5 text-xs text-danger">{errors.message}</p>}
      </div>
      <label className="flex w-fit cursor-pointer items-center gap-2 text-xs font-bold text-amber hover:text-gold">
        <Paperclip size={14} aria-hidden />
        {file ?? "Attach a screenshot (optional)"}
        <input type="file" accept="image/*" className="sr-only" onChange={(e) => setFile(e.target.files?.[0]?.name)} />
      </label>
      <Button type="submit" size="lg" className="w-full sm:w-auto">
        Send message
      </Button>
    </form>
  );
}
