"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { CheckCircle2, Circle, CircleAlert, FileText, Search, XCircle } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Badge } from "@/components/ui/StatusBadge";
import { applicationStore, statusMeta, type Application, type ApplicationStatus as Status } from "@/lib/organizerApplications";

const steps = ["Received", "In review", "Decision"] as const;
/** How far along each status is on the three-step line. */
const stepOf: Record<Status, number> = { received: 0, in_review: 1, more_info: 1, approved: 2, declined: 2 };

const dateOf = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const noopSubscribe = () => () => undefined;

export function ApplicationStatus() {
  const params = useSearchParams();
  const sent = params.get("sent") === "1";
  const apps = useSyncExternalStore(applicationStore.subscribe, applicationStore.getSnapshot, applicationStore.getServerSnapshot);
  const ready = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const first = params.get("ref") && params.get("email") ? { ref: params.get("ref")!, email: params.get("email")! } : null;
  const [lookup, setLookup] = useState<{ ref: string; email: string } | null>(first);
  const [errors, setErrors] = useState<{ ref?: string; email?: string }>({});

  const result = lookup
    ? apps.find((a) => a.ref === lookup.ref.trim().toUpperCase() && a.email === lookup.email.trim().toLowerCase())
    : undefined;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const ref = String(data.get("ref") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const found: typeof errors = {};
    if (!ref) found.ref = "Enter the reference we gave you, like ORG-1234.";
    if (!/^\S+@\S+\.\S+$/.test(email)) found.email = "Enter the email you applied with.";
    setErrors(found);
    if (Object.keys(found).length === 0) setLookup({ ref, email });
  }

  return (
    <div className="space-y-6">
      {sent && result && (
        <p role="status" className="flex items-start gap-3 rounded-xl border border-success/40 bg-success/10 p-4 text-sm text-text">
          <CheckCircle2 size={18} aria-hidden className="mt-0.5 shrink-0 text-success" />
          <span>
            Thanks, your application is in. Your reference is <strong>{result.ref}</strong>. Keep it, with your email, to check
            progress here any time.
          </span>
        </p>
      )}

      {ready && result ? (
        <ResultCard app={result} />
      ) : (
        <Card className="p-6">
          <h2 className="text-lg font-bold text-text">Check your application</h2>
          <p className="mt-1 text-[13px] text-muted">Enter your reference and the email you applied with.</p>
          <form onSubmit={onSubmit} noValidate className="mt-5 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Reference" name="ref" defaultValue={lookup?.ref ?? ""} placeholder="ORG-1234" icon={<Search />} error={errors.ref} />
              <Field label="Email" name="email" type="email" defaultValue={lookup?.email ?? ""} placeholder="you@example.com" error={errors.email} />
            </div>
            {ready && lookup && !result && (
              <p role="alert" className="flex items-start gap-2 text-xs text-danger">
                <CircleAlert size={14} aria-hidden className="mt-0.5 shrink-0" />
                <span>
                  We couldn&apos;t find an application with that reference and email. Check both and try again, or{" "}
                  <Link href="/contact" className="font-bold underline">
                    contact us
                  </Link>
                  .
                </span>
              </p>
            )}
            <Button type="submit">Check status</Button>
          </form>
        </Card>
      )}

      {ready && result && (
        <button type="button" onClick={() => setLookup(null)} className="text-xs font-bold text-amber hover:text-gold">
          Check a different application
        </button>
      )}
    </div>
  );
}

function ResultCard({ app }: { app: Application }) {
  const meta = statusMeta[app.status];
  const at = stepOf[app.status];
  const bad = app.status === "declined";

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line p-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-amber">Application {app.ref}</p>
          <h2 className="mt-1 font-display text-[26px] font-bold leading-tight text-text">{app.organization}</h2>
          <p className="mt-1 text-xs text-dim">
            Sent {dateOf(app.submittedAt)} · {app.kind}
          </p>
        </div>
        <Badge tone={meta.tone} dot>
          {meta.label}
        </Badge>
      </div>

      <div className="space-y-6 p-6">
        <ol className="grid grid-cols-3 gap-2" aria-label="Progress">
          {steps.map((label, i) => {
            const done = i < at || (i === at && app.status === "approved");
            const current = i === at;
            const Icon = bad && i === 2 ? XCircle : done ? CheckCircle2 : Circle;
            return (
              <li key={label} className="flex flex-col items-center gap-2 text-center">
                <Icon
                  size={22}
                  aria-hidden
                  className={bad && i === 2 ? "text-danger" : done ? "text-success" : current ? "text-amber" : "text-dim"}
                />
                <span className={`text-xs font-bold ${current ? "text-text" : "text-dim"}`}>{label}</span>
              </li>
            );
          })}
        </ol>

        <div className="rounded-lg border border-line bg-surface-2 p-4">
          <p className="text-sm font-bold text-text">{meta.label}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">{meta.summary}</p>
          {app.note && (
            <p className="mt-3 rounded-md border-l-2 border-amber bg-surface px-3 py-2 text-[13px] leading-relaxed text-text">
              {app.note}
            </p>
          )}
        </div>

        {app.status === "more_info" && (
          <p className="text-[13px] leading-relaxed text-muted">
            Reply to the email we sent you, or send it through our{" "}
            <Link href="/contact" className="font-bold text-amber hover:text-gold">
              contact form
            </Link>{" "}
            with your reference <strong className="text-text">{app.ref}</strong>. We&apos;ll pick the review up again as soon as we hear
            from you.
          </p>
        )}
        {app.status === "approved" && <LinkButton href="/login?next=/organizer">Log in to the organizer area</LinkButton>}
        {app.status === "declined" && (
          <p className="text-[13px] leading-relaxed text-muted">
            You can apply again with more detail after 30 days, or{" "}
            <Link href="/contact" className="font-bold text-amber hover:text-gold">
              ask us what we need to see
            </Link>
            .
          </p>
        )}

        <dl className="grid gap-4 border-t border-line pt-5 text-[13px] sm:grid-cols-2">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-dim">Applicant</dt>
            <dd className="mt-1 text-text">
              {app.name} · {app.email}
            </dd>
          </div>
          {app.contact && (
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-dim">Contact</dt>
              <dd className="mt-1 text-text">{app.contact}</dd>
            </div>
          )}
          {app.documents.length > 0 && (
            <div className="sm:col-span-2">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-dim">Documents</dt>
              <dd className="mt-1 flex flex-wrap gap-2">
                {app.documents.map((d) => (
                  <span key={d.name} className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs text-muted">
                    <FileText size={12} aria-hidden /> {d.name}
                  </span>
                ))}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </Card>
  );
}
