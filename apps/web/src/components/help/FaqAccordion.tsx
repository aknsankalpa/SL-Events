"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";

type Item = { q: string; a: string };

/** Expandable questions and answers. One opens at a time. */
export function FaqAccordion({ items, startOpen = null, emptyText }: { items: Item[]; startOpen?: number | null; emptyText?: string }) {
  const [open, setOpen] = useState<number | null>(startOpen);

  if (items.length === 0) {
    return <p className="px-6 py-8 text-center text-sm text-muted">{emptyText ?? "No questions here."}</p>;
  }
  return (
    <ul className="divide-y divide-line">
      {items.map((f, i) => {
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
    </ul>
  );
}
