"use client";

import { useState } from "react";
import { Clock, FileText, Landmark, Mail, MessageCircle, Minus, Paperclip, Phone, Plus, QrCode, Search, User, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, SelectField } from "@/components/ui/Field";
import { contactChannels, faqTotal, faqs, helpCategories } from "@/lib/content";

const categoryIcons: Record<(typeof helpCategories)[number]["icon"], LucideIcon> = {
  bank: Landmark,
  qr: QrCode,
  receipt: FileText,
  user: User,
};

const contactIcons: Record<(typeof contactChannels)[number]["icon"], LucideIcon> = {
  message: MessageCircle,
  mail: Mail,
  phone: Phone,
  clock: Clock,
};

const topics = ["Booking & payment", "Tickets & QR codes", "Refunds & cancellations", "Account & login", "Something else"];

export function HelpCenter() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<number | null>(0);
  const [sent, setSent] = useState(false);
  const [file, setFile] = useState<string>();

  const q = query.trim().toLowerCase();
  const list = faqs.filter((f) => !q || `${f.q} ${f.a}`.toLowerCase().includes(q));

  function onSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const message = String(new FormData(e.currentTarget).get("message") ?? "").trim();
    if (!message) return;
    // TODO: POST the message (and any attachment) to the support API.
    setSent(true);
  }

  return (
    <>
      <section className="border-b border-line bg-[radial-gradient(40%_120%_at_100%_0%,rgb(110_80_20/0.35),transparent_70%)]">
        <div className="mx-auto max-w-site px-5 py-12 text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-amber">Help centre</p>
          <h1 className="font-display text-[38px] font-bold leading-tight text-text">How can we help?</h1>
          <form role="search" onSubmit={(e) => e.preventDefault()} className="mx-auto mt-7 flex max-w-xl items-center gap-2 rounded-xl border border-line bg-surface p-1.5">
            <label className="flex flex-1 items-center gap-3 px-3">
              <Search size={16} className="text-muted" aria-hidden />
              <span className="sr-only">Search for answers</span>
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOpen(null);
                }}
                placeholder='Search for answers, e.g. "upload proof"'
                className="h-11 w-full bg-transparent text-sm text-text placeholder:text-dim focus:outline-none"
              />
            </label>
            <Button type="submit" size="md">
              Search
            </Button>
          </form>
        </div>
      </section>

      <div className="mx-auto max-w-site px-5 py-10">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {helpCategories.map((c) => {
            const Icon = categoryIcons[c.icon];
            return (
              <li key={c.id}>
                <a
                  href="#faq"
                  className="flex items-center gap-4 rounded-xl border border-line bg-surface p-5 transition-colors hover:border-gold/50 focus-visible:focus-ring"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold">
                    <Icon size={18} aria-hidden />
                  </span>
                  <span className="leading-tight">
                    <span className="block text-[13px] font-bold text-text">{c.title}</span>
                    <span className="mt-1 block text-[11px] text-dim">{c.articles} articles</span>
                  </span>
                </a>
              </li>
            );
          })}
        </ul>

        <div className="mt-10 grid items-start gap-8 lg:grid-cols-[1fr_21rem]">
          <section id="faq" aria-labelledby="faq-title">
            <h2 id="faq-title" className="mb-4 text-lg font-bold text-text">
              Frequently asked questions
            </h2>
            <Card className="overflow-hidden">
              <ul className="divide-y divide-line">
                {list.map((f, i) => {
                  const expanded = open === i;
                  return (
                    <li key={f.q}>
                      <h3>
                        <button
                          type="button"
                          aria-expanded={expanded}
                          aria-controls={`faq-${i}`}
                          onClick={() => setOpen(expanded ? null : i)}
                          className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left text-[13px] font-bold text-text focus-visible:focus-ring"
                        >
                          {f.q}
                          {expanded ? <Minus size={14} aria-hidden className="shrink-0 text-amber" /> : <Plus size={14} aria-hidden className="shrink-0 text-muted" />}
                        </button>
                      </h3>
                      {expanded && (
                        <p id={`faq-${i}`} className="px-6 pb-5 text-[13px] leading-relaxed text-muted">
                          {f.a}
                        </p>
                      )}
                    </li>
                  );
                })}
                {list.length === 0 && <li className="px-6 py-8 text-center text-sm text-muted">No answers match &ldquo;{query}&rdquo;. Try contacting us.</li>}
              </ul>
              <div className="border-t border-line px-6 py-4">
                {/* TODO: link to the full FAQ page once it exists. */}
                <span className="text-xs font-bold text-amber">See all {faqTotal} questions</span>
              </div>
            </Card>
          </section>

          <div className="space-y-5">
            <Card className="p-6">
              <h2 className="mb-5 text-lg font-bold text-text">Contact us</h2>
              <ul className="space-y-4">
                {contactChannels.map((c) => {
                  const Icon = contactIcons[c.icon];
                  return (
                    <li key={c.id} className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold">
                        <Icon size={16} aria-hidden />
                      </span>
                      <span className="leading-tight">
                        <span className="block text-[13px] font-bold text-text">{c.label}</span>
                        <span className="mt-0.5 block text-[11px] text-dim">{c.value}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>

            <Card className="p-6">
              <h2 className="mb-5 text-lg font-bold text-text">Send a message</h2>
              {sent ? (
                <p role="status" className="rounded-lg border border-success/40 bg-success/10 p-4 text-sm text-text">
                  Thanks, we&apos;ve got your message. We reply every day between 9 AM and 10 PM KST.
                </p>
              ) : (
                <form onSubmit={onSend} className="space-y-4">
                  <SelectField label="Topic" name="topic">
                    {topics.map((t) => (
                      <option key={t} className="bg-surface">
                        {t}
                      </option>
                    ))}
                  </SelectField>
                  <Field label="Booking number (if you have one)" name="booking" placeholder="SL-41698" />
                  <div>
                    <label htmlFor="message" className="mb-2 block text-xs font-bold text-muted">
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={4}
                      placeholder="Tell us what happened"
                      className="w-full resize-none rounded-lg border border-line bg-surface p-4 text-sm text-text placeholder:text-dim focus:border-gold focus:outline-none"
                    />
                  </div>
                  <label className="flex w-fit cursor-pointer items-center gap-2 text-xs font-bold text-amber hover:text-gold">
                    <Paperclip size={14} aria-hidden />
                    {file ?? "Attach a screenshot"}
                    <input type="file" accept="image/*" className="sr-only" onChange={(e) => setFile(e.target.files?.[0]?.name)} />
                  </label>
                  <Button type="submit" size="lg" className="w-full">
                    Send message
                  </Button>
                </form>
              )}
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
