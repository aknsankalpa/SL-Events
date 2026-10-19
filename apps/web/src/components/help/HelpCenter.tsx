"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { ArrowRight, Landmark, QrCode, Search, Store, User, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { faqTotal, faqs, helpCategories } from "@/lib/content";
import { ContactChannels } from "./ContactChannels";
import { ContactForm } from "./ContactForm";
import { FaqAccordion } from "./FaqAccordion";
import { SupportRequests } from "./SupportRequests";

const categoryIcons: Record<(typeof helpCategories)[number]["icon"], LucideIcon> = {
  bank: Landmark,
  qr: QrCode,
  user: User,
  store: Store,
};

const PREVIEW = 6;

/** The help centre: search the questions, jump to a topic, or write to us. The full FAQ and contact pages go further. */
export function HelpCenter() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matches = faqs.filter((f) => !q || `${f.q} ${f.a}`.toLowerCase().includes(q));
  const list = q ? matches : matches.slice(0, PREVIEW);

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
                onChange={(e) => setQuery(e.target.value)}
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
            const count = faqs.filter((f) => f.cat === c.id).length;
            return (
              <li key={c.id}>
                <Link
                  href={`/faq?cat=${c.id}`}
                  className="flex items-center gap-4 rounded-xl border border-line bg-surface p-5 transition-colors hover:border-gold/50 focus-visible:focus-ring"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold">
                    <Icon size={18} aria-hidden />
                  </span>
                  <span className="leading-tight">
                    <span className="block text-[13px] font-bold text-text">{c.title}</span>
                    <span className="mt-1 block text-[11px] text-dim">
                      {count} answer{count === 1 ? "" : "s"}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-10 grid items-start gap-8 lg:grid-cols-[1fr_24rem]">
          <section id="faq" aria-labelledby="faq-title">
            <h2 id="faq-title" className="mb-4 text-lg font-bold text-text">
              {q ? `Answers for “${query.trim()}”` : "Frequently asked questions"}
            </h2>
            <Card className="overflow-hidden">
              <FaqAccordion
                key={q}
                items={list}
                startOpen={q ? null : 0}
                emptyText={`No answers match “${query}”. Try different words, or write to us.`}
              />
              <div className="border-t border-line px-6 py-4">
                <Link href="/faq" className="inline-flex items-center gap-1.5 text-xs font-bold text-amber hover:text-gold">
                  See all {faqTotal} questions <ArrowRight size={12} aria-hidden />
                </Link>
              </div>
            </Card>
            <p className="mt-4 text-xs text-dim">
              Looking for how to pay?{" "}
              <Link href="/payment-instructions" className="font-bold text-amber hover:text-gold">
                Read the payment instructions
              </Link>
              .
            </p>
          </section>

          <div className="space-y-5">
            <Card className="p-6">
              <h2 className="mb-5 text-lg font-bold text-text">Contact us</h2>
              <ContactChannels />
            </Card>
            <Card className="p-6">
              <h2 className="mb-5 text-lg font-bold text-text">Send a message</h2>
              <Suspense fallback={<div className="h-72" aria-hidden />}>
                <ContactForm />
              </Suspense>
            </Card>
            <SupportRequests />
          </div>
        </div>
      </div>
    </>
  );
}
