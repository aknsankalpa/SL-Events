"use client";

import { ChevronDown, X, type LucideIcon } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { EventThumb } from "@/components/ui/Card";
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
  const id = useId();
  return (
    <div className={`relative ${className}`}>
      <div className="flex min-w-[15rem] items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2 focus-within:border-gold">
        <EventThumb category={event.category} size={32} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[13px] font-bold text-text">{event.title}</p>
          <p className="mt-0.5 text-[11px] text-dim">{event.dateLabel}</p>
        </div>
        <ChevronDown size={14} aria-hidden className="shrink-0 text-muted" />
      </div>
      <label htmlFor={id} className="sr-only">
        Event
      </label>
      <select
        id={id}
        value={event.id}
        onChange={(e) => setEventId(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      >
        {events.map((e) => (
          <option key={e.id} value={e.id}>
            {e.title}
          </option>
        ))}
      </select>
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

export function Panel({ className = "", children }: { className?: string; children: ReactNode }) {
  return <section className={`rounded-xl border border-line bg-surface ${className}`}>{children}</section>;
}

/** Native <dialog> wrapper: focus trapping, Esc to close and a backdrop come from the platform. */
export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-line bg-surface p-0 text-text backdrop:bg-black/70"
    >
      <div className="flex items-center justify-between border-b border-line px-6 py-4">
        <h2 className="text-base font-bold">{title}</h2>
        <button type="button" aria-label="Close" onClick={onClose} className="rounded p-1 text-muted hover:text-text">
          <X size={18} />
        </button>
      </div>
      <div className="p-6">{children}</div>
    </dialog>
  );
}

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
