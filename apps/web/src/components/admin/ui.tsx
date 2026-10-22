"use client";

import { type ReactNode } from "react";
import { Breadcrumbs, type Crumb } from "@/components/ui/PageHeader";

export { Dialog } from "@/components/ui/Dialog";

/** Title row for every admin page: small section label, serif title, actions that wrap on phones. */
export function AdminHeader({
  section,
  title,
  actions,
  children,
}: {
  section: string;
  title: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  const crumbs: Crumb[] = [{ label: section }];
  return (
    <header className="mb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Breadcrumbs crumbs={crumbs} />
          <h1 className="mt-2 font-display text-[28px] font-bold leading-tight text-text sm:text-[34px]">{title}</h1>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
      {children}
    </header>
  );
}

export function Panel({ className = "", children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={`rounded-2xl border border-line bg-surface ${className}`} {...rest}>
      {children}
    </section>
  );
}

export function Avatar({ initials, size = 40 }: { initials: string; size?: number }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-full border border-gold/60 bg-surface-2 text-[11px] font-bold text-gold"
    >
      {initials}
    </span>
  );
}

/** Underline tabs with counts, as in the designs. Scrolls sideways on a phone instead of wrapping. */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-6 overflow-x-auto border-b border-line">
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 pb-3 text-[13px] font-bold transition-colors focus-visible:focus-ring ${
              active ? "border-amber text-gold" : "border-transparent text-muted hover:text-text"
            }`}
          >
            {t.label}
            {t.count !== undefined && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted">{t.count.toLocaleString("en-US")}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Vertical bars in plain HTML so they stay sharp and responsive. The last bar is highlighted. */
export function BarChart({
  data,
  height = 180,
  labelEvery = 1,
  max,
}: {
  data: { label: string; value: number }[];
  height?: number;
  labelEvery?: number;
  max?: number;
}) {
  const top = max ?? Math.max(1, ...data.map((d) => d.value));
  const ceil = Math.ceil(top / 20) * 20 || top;
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((t) => Math.round(ceil * t));
  return (
    <figure className="mt-4">
      <div className="flex gap-3">
        <ul aria-hidden className="flex flex-col justify-between text-right text-[10px] text-dim" style={{ height }}>
          {ticks.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <div className="relative flex-1">
          <div aria-hidden className="absolute inset-0 flex flex-col justify-between">
            {ticks.map((t) => (
              <span key={t} className="border-t border-dashed border-line" />
            ))}
          </div>
          <ol className="relative flex items-end gap-[3px] sm:gap-1.5" style={{ height }}>
            {data.map((d, i) => {
              const last = i === data.length - 1;
              return (
                <li key={`${d.label}-${i}`} className="relative flex h-full min-w-0 flex-1 flex-col justify-end" title={`${d.label}: ${d.value}`}>
                  {last && <span className="mb-1 text-center text-[11px] font-bold text-text">{d.value}</span>}
                  <span
                    className={`block w-full rounded-t ${last ? "bg-gold" : "bg-amber/70"}`}
                    style={{ height: `${(d.value / ceil) * 100}%`, minHeight: 2 }}
                  />
                </li>
              );
            })}
          </ol>
          <ol aria-hidden className="mt-2 flex gap-[3px] text-[10px] text-dim sm:gap-1.5">
            {data.map((d, i) => (
              <li key={`${d.label}-${i}`} className="min-w-0 flex-1 text-center">
                {i % labelEvery === 0 ? d.label : ""}
              </li>
            ))}
          </ol>
        </div>
      </div>
      <figcaption className="sr-only">{data.map((d) => `${d.label}: ${d.value}`).join(", ")}</figcaption>
    </figure>
  );
}

/** A thin progress bar. */
export function Meter({ value, max, className = "" }: { value: number; max: number; className?: string }) {
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-line ${className}`} role="presentation">
      <div className="h-full rounded-full bg-gradient-to-r from-amber to-gold" style={{ width: `${max ? Math.min(100, (value / max) * 100) : 0}%` }} />
    </div>
  );
}

/** A short confirmation line that disappears by itself. The caller owns the message state. */
export function Toast({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="status" className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-lg border border-success/40 bg-surface px-5 py-3 text-sm text-text shadow-2xl shadow-black/60">
      {message}
    </p>
  );
}
