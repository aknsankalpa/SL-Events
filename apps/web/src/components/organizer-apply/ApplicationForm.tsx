"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { FileText, Mail, Paperclip, Phone, Building2, User, Link2, X } from "lucide-react";
import { useSession } from "@/components/auth/useSession";
import { Button } from "@/components/ui/Button";
import { Checkbox, Field, SelectField } from "@/components/ui/Field";
import { eventKinds, openApplicationFor, submitApplication } from "@/lib/organizerApplications";

const MAX_FILES = 3;
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = ["application/pdf", "image/png", "image/jpeg"];

type Errors = Partial<Record<"name" | "email" | "organization" | "about" | "terms" | "documents", string>>;

const formatSize = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

/** Short on purpose: five things we need, three we'd like. Nothing that depends on the applicant's country. */
export function ApplicationForm() {
  const router = useRouter();
  const { user } = useSession();
  const fileId = useId();
  const [errors, setErrors] = useState<Errors>({});
  const [files, setFiles] = useState<File[]>([]);
  const [existing, setExisting] = useState<{ ref: string; email: string }>();

  function addFiles(list: FileList | null) {
    if (!list) return;
    const incoming = [...list];
    const bad = incoming.find((f) => !ACCEPT.includes(f.type));
    if (bad) return setErrors((e) => ({ ...e, documents: `${bad.name} isn't a PDF, PNG or JPG.` }));
    const big = incoming.find((f) => f.size > MAX_BYTES);
    if (big) return setErrors((e) => ({ ...e, documents: `${big.name} is larger than 5 MB.` }));
    const next = [...files, ...incoming];
    if (next.length > MAX_FILES) return setErrors((e) => ({ ...e, documents: `Attach up to ${MAX_FILES} files.` }));
    setErrors((e) => ({ ...e, documents: undefined }));
    setFiles(next);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const get = (k: string) => String(data.get(k) ?? "").trim();

    const found: Errors = {};
    if (!get("name")) found.name = "Enter your name.";
    if (!/^\S+@\S+\.\S+$/.test(get("email"))) found.email = "Enter a valid email address.";
    if (!get("organization")) found.organization = "Enter the name of your group, business or team.";
    if (get("about").length < 20) found.about = "Tell us a little more: a sentence or two is enough.";
    if (!data.get("terms")) found.terms = "Please accept the organizer terms to apply.";
    setErrors((cur) => ({ ...found, documents: cur.documents }));
    if (Object.keys(found).length) return;

    const open = openApplicationFor(get("email"));
    if (open) {
      setExisting({ ref: open.ref, email: open.email });
      return;
    }

    // TODO: POST the application and upload the attached files through the API.
    const app = submitApplication({
      name: get("name"),
      email: get("email"),
      contact: get("contact"),
      organization: get("organization"),
      kind: get("kind"),
      about: get("about"),
      link: get("link"),
      documents: files.map((f) => ({ name: f.name, size: f.size })),
    });
    router.push(`/become-an-organizer/status?ref=${app.ref}&email=${encodeURIComponent(app.email)}&sent=1`);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8" aria-label="Organizer application">
      <fieldset className="space-y-5">
        <legend className="mb-1 text-lg font-bold text-text">About you</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Your name" name="name" autoComplete="name" defaultValue={user?.name ?? ""} icon={<User />} error={errors.name} />
          <Field
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={user?.email ?? ""}
            placeholder="you@example.com"
            icon={<Mail />}
            error={errors.email}
            hint="We reply here and use it to find your application."
          />
        </div>
        <Field
          label="Phone or messaging app (optional)"
          name="contact"
          autoComplete="tel"
          icon={<Phone />}
          placeholder="A number, or an app and username"
          hint="Write it the way you'd like us to use it."
        />
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="mb-1 text-lg font-bold text-text">Your events</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Group, business or team name"
            name="organization"
            icon={<Building2 />}
            placeholder="What buyers will see"
            error={errors.organization}
          />
          <SelectField label="What will you run?" name="kind" defaultValue={eventKinds[0]}>
            {eventKinds.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </SelectField>
        </div>
        <div>
          <label htmlFor="about" className="mb-2 block text-xs font-bold text-muted">
            Tell us about your events
          </label>
          <textarea
            id="about"
            name="about"
            rows={4}
            aria-invalid={errors.about ? true : undefined}
            placeholder="What you organize, who comes, and how often."
            className={`w-full resize-none rounded-lg border bg-surface p-4 text-sm text-text placeholder:text-dim focus:border-gold focus:outline-none ${
              errors.about ? "border-danger" : "border-line"
            }`}
          />
          {errors.about && <p className="mt-1.5 text-xs text-danger">{errors.about}</p>}
        </div>
        <Field
          label="Website or social page (optional)"
          name="link"
          icon={<Link2 />}
          placeholder="A page that shows your past events"
        />
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-1 text-lg font-bold text-text">Supporting documents</legend>
        <p className="text-[13px] leading-relaxed text-muted">
          Optional. A poster from a past event, a photo of your group, or anything that shows who you are. We&apos;ll ask if we need
          more. Up to {MAX_FILES} files, PDF, PNG or JPG, 5 MB each.
        </p>
        <label
          htmlFor={fileId}
          className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-dashed border-amber/50 px-4 py-3 text-xs font-bold text-amber transition-colors hover:border-gold hover:text-gold"
        >
          <Paperclip size={14} aria-hidden /> Attach files
        </label>
        <input
          id={fileId}
          type="file"
          multiple
          accept=".pdf,image/png,image/jpeg"
          className="sr-only"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {files.length > 0 && (
          <ul className="space-y-2">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center gap-3 rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs">
                <FileText size={14} aria-hidden className="shrink-0 text-gold" />
                <span className="min-w-0 flex-1 truncate text-text">{f.name}</span>
                <span className="shrink-0 text-dim">{formatSize(f.size)}</span>
                <button
                  type="button"
                  aria-label={`Remove ${f.name}`}
                  onClick={() => setFiles(files.filter((_, j) => j !== i))}
                  className="rounded p-1 text-muted hover:text-danger"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
        {errors.documents && <p className="text-xs text-danger">{errors.documents}</p>}
      </fieldset>

      <div className="space-y-3">
        <Checkbox
          name="terms"
          label={
            <>
              I agree to the{" "}
              <Link href="/terms" className="text-text underline-offset-2 hover:underline">
                Terms and conditions
              </Link>{" "}
              and understand SL Events reviews every application. (Required)
            </>
          }
        />
        {errors.terms && <p className="text-xs text-danger">{errors.terms}</p>}
      </div>

      {existing && (
        <p role="status" className="rounded-lg border border-amber/40 bg-amber/10 p-4 text-[13px] leading-relaxed text-text">
          There&apos;s already an application for this email that hasn&apos;t been decided yet ({existing.ref}).{" "}
          <Link
            href={`/become-an-organizer/status?ref=${existing.ref}&email=${encodeURIComponent(existing.email)}`}
            className="font-bold text-amber hover:text-gold"
          >
            Check its status
          </Link>
          .
        </p>
      )}

      <Button type="submit" size="lg" className="w-full sm:w-auto">
        Send application
      </Button>
    </form>
  );
}
