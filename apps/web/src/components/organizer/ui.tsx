"use client";

import { type LucideIcon } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { EventThumb } from "@/components/ui/Card";
import { Select, SelectOption } from "@/components/ui/Select";
import { Breadcrumbs, type Crumb } from "@/components/ui/PageHeader";
import { useOrganizer } from "./OrganizerContext";

type OrgPageHeaderProps = {
  crumbs: Crumb[];
  title: ReactNode;
  titleAside?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
};

/** Title row used on every organizer page: breadcrumb, serif title, and actions that wrap on phones. */
export function OrgPageHeader({ crumbs, title, titleAside, actions, children }: OrgPageHeaderProps) {
  return (
    <header className="mb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Breadcrumbs crumbs={crumbs} />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-[30px] font-bold leading-tight text-text sm:text-[34px]">{title}</h1>
            {titleAside}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
      {children}
    </header>
  );
}

/** Event switcher shared by every event-scoped page. */
export function EventPicker({ className = "" }: { className?: string }) {
  const { events, event, setEventId } = useOrganizer();
  return (
    <div className={className}>
      <Select
        aria-label="Event"
        value={event.id}
        onChange={(e) => setEventId(e.target.value)}
        className="min-w-[15rem] w-full rounded-xl border border-line bg-surface px-3 py-2 focus:border-gold focus:outline-none"
        triggerContent={
          <span className="flex items-center gap-3">
            <EventThumb category={event.category} size={32} />
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[13px] font-bold text-text">{event.title}</span>
              <span className="mt-0.5 block text-[11px] font-normal text-dim">{event.dateLabel}</span>
            </span>
          </span>
        }
      >
        {events.map((e) => (
          <SelectOption key={e.id} value={e.id} description={e.dateLabel}>
            {e.title}
          </SelectOption>
        ))}
      </Select>
    </div>
  );
}

type StatProps = {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  Icon?: LucideIcon;
  subTone?: "default" | "up" | "warn";
};

export function StatCard({ label, value, sub, Icon, subTone = "default" }: StatProps) {
  const tone = subTone === "up" ? "text-success" : subTone === "warn" ? "text-amber" : "text-dim";
  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold text-muted">{label}</p>
        {Icon && <Icon size={14} aria-hidden className="shrink-0 text-dim" />}
      </div>
      <p className="mt-3 text-[26px] font-bold leading-none text-text sm:text-[28px]">{value}</p>
      {sub && <p className={`mt-2.5 flex items-center gap-1.5 text-[11px] ${tone}`}>{sub}</p>}
    </div>
  );
}

export function Panel({ className = "", bare = false, children }: { className?: string; bare?: boolean; children: ReactNode }) {
  // "bare" drops the card chrome so the content can sit inside another card (a tab panel).
  return <section className={`${bare ? "" : "rounded-xl border border-line bg-surface"} ${className}`}>{children}</section>;
}

type TabSpec = { id: string; label: string; content: ReactNode };

/**
 * Several views in one card, so a page can fit one screen on desktop: the tab body scrolls inside the card instead
 * of the page growing. On phones it simply stacks and the page scrolls.
 */
export function TabbedPanel({ label, tabs, className = "" }: { label: string; tabs: TabSpec[]; className?: string }) {
  const uid = useId();
  const [active, setActive] = useState(tabs[0]!.id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0]!;

  return (
    <section aria-label={label} className={`flex flex-col overflow-hidden rounded-xl border border-line bg-surface lg:min-h-0 ${className}`}>
      <div role="tablist" aria-label={label} className="flex shrink-0 gap-1 overflow-x-auto border-b border-line px-3 py-2.5 sm:px-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`${uid}-${t.id}`}
            aria-selected={current.id === t.id}
            aria-controls={`${uid}-panel`}
            onClick={() => setActive(t.id)}
            className={`h-8 shrink-0 rounded-lg px-3 text-xs font-bold transition-colors focus-visible:focus-ring ${
              current.id === t.id ? "bg-gold/15 text-gold" : "text-muted hover:text-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`${uid}-panel`}
        aria-labelledby={`${uid}-${current.id}`}
        tabIndex={0}
        className="overflow-auto focus-visible:focus-ring lg:min-h-0 lg:flex-1"
      >
        {current.content}
      </div>
    </section>
  );
}

export { Dialog } from "@/components/ui/Dialog";

/** Downloads rows as a UTF-8 CSV (with BOM so Excel reads Korean and Sinhala text correctly). */
export function downloadCsv(fileName: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
