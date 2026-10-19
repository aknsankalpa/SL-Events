"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { faqs, helpCategories, type FaqCategory } from "@/lib/content";
import { FaqAccordion } from "./FaqAccordion";

/** Every question, filterable by topic and searchable. A topic can be linked to with ?cat=booking. */
export function FaqPage() {
  const params = useSearchParams();
  const fromLink = params.get("cat");
  const [cat, setCat] = useState<FaqCategory | "all">(helpCategories.some((c) => c.id === fromLink) ? (fromLink as FaqCategory) : "all");
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const list = faqs.filter((f) => (cat === "all" || f.cat === cat) && (!q || `${f.q} ${f.a}`.toLowerCase().includes(q)));

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <form role="search" onSubmit={(e) => e.preventDefault()}>
        <label className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 focus-within:border-gold">
          <Search size={16} className="text-muted" aria-hidden />
          <span className="sr-only">Search the FAQ</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the questions"
            className="h-12 w-full bg-transparent text-sm text-text placeholder:text-dim focus:outline-none"
          />
        </label>
      </form>

      <div role="group" aria-label="Topic" className="mt-5 flex flex-wrap gap-2">
        {[{ id: "all" as const, title: "All" }, ...helpCategories].map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={cat === c.id}
            onClick={() => setCat(c.id)}
            className={`rounded-full border px-4 py-2 text-[13px] font-bold transition-colors focus-visible:focus-ring ${
              cat === c.id ? "border-transparent bg-gradient-to-b from-gold to-amber text-ink" : "border-line text-muted hover:border-gold/50 hover:text-text"
            }`}
          >
            {c.title}
          </button>
        ))}
      </div>

      <Card className="mt-6 overflow-hidden">
        <FaqAccordion key={`${cat}-${q}`} items={list} emptyText={`No answers match “${query}”. Try different words, or write to us.`} />
      </Card>

      <div className="mt-8 rounded-xl border border-line bg-surface p-6 text-center">
        <p className="text-sm font-bold text-text">Didn&apos;t find your answer?</p>
        <p className="mt-1 text-[13px] text-muted">
          Read the{" "}
          <Link href="/payment-instructions" className="font-bold text-amber hover:text-gold">
            payment instructions
          </Link>{" "}
          or{" "}
          <Link href="/contact" className="font-bold text-amber hover:text-gold">
            write to us
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
