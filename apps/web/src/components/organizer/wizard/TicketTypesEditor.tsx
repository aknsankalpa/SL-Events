"use client";

import { useState } from "react";
import { CalendarDays, Check, GripVertical, Info, Plus, Trash2 } from "lucide-react";
import { Toggle } from "@/components/ui/Toggle";
import { formatKrw } from "@/lib/format";
import { Panel } from "../ui";
import { capacityOf, useEventDraft, VENUE_LIMIT, type DraftTicketType } from "./EventDraft";

const palette = ["#ef2b2b", "#f7cb60", "#ece7dc", "#b5ada0", "#4ade80", "#60a5fa"];

const num = (v: string) => Math.max(0, Number(v.replace(/\D/g, "")) || 0);

export function TicketTypesEditor() {
  const { draft, patch } = useEventDraft();
  const types = draft.ticketTypes;
  const [dragId, setDragId] = useState<string | null>(null);

  const set = (next: DraftTicketType[]) => patch({ ticketTypes: next });
  const update = (id: string, p: Partial<DraftTicketType>) => set(types.map((t) => (t.id === id ? { ...t, ...p } : t)));

  function move(overId: string) {
    if (!dragId || dragId === overId) return;
    const from = types.findIndex((t) => t.id === dragId);
    const to = types.findIndex((t) => t.id === overId);
    const next = [...types];
    next.splice(to, 0, next.splice(from, 1)[0]!);
    set(next);
  }

  function add() {
    set([
      ...types,
      {
        id: `type-${Date.now()}`,
        name: "",
        price: 0,
        quantity: 50,
        maxPerOrder: 6,
        color: palette[types.length % palette.length]!,
        saleNote: "On sale from publish until the event",
        perks: "",
        visible: true,
      },
    ]);
  }

  const cap = capacityOf(types);
  const pct = Math.min(100, Math.round((cap.tickets / VENUE_LIMIT) * 100));
  const over = cap.tickets > VENUE_LIMIT;

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[1fr_19.5rem]">
      <div className="space-y-4">
        {types.map((t) => (
          <section
            key={t.id}
            aria-label={`${t.name || "New"} ticket type`}
            draggable={dragId === t.id}
            onDragOver={(e) => {
              e.preventDefault();
              move(t.id);
            }}
            onDragEnd={() => setDragId(null)}
            className={`overflow-hidden rounded-xl border bg-surface ${dragId === t.id ? "border-gold" : "border-line"}`}
          >
            <div className="flex flex-wrap items-end gap-3 p-4 sm:flex-nowrap">
              <button
                type="button"
                aria-label={`Drag to reorder ${t.name || "ticket type"}`}
                onMouseDown={() => setDragId(t.id)}
                onMouseUp={() => setDragId(null)}
                className="hidden h-12 cursor-grab items-center text-dim hover:text-text sm:flex"
              >
                <GripVertical size={14} />
              </button>
              <button
                type="button"
                aria-label="Change colour"
                onClick={() => update(t.id, { color: palette[(palette.indexOf(t.color) + 1) % palette.length]! })}
                style={{ backgroundColor: t.color }}
                className="mb-0.5 h-11 w-3 shrink-0 rounded-sm"
              />
              <label className="min-w-0 flex-1 basis-[45%] sm:basis-auto">
                <span className="mb-2 block text-[11px] font-bold text-muted">Ticket name</span>
                <input
                  value={t.name}
                  onChange={(e) => update(t.id, { name: e.target.value })}
                  placeholder="e.g. General"
                  className="h-12 w-full rounded-lg border border-line bg-surface-2 px-3 text-sm text-text placeholder:text-dim focus:border-gold focus:outline-none"
                />
              </label>
              <label className="w-32 shrink-0">
                <span className="mb-2 block text-[11px] font-bold text-muted">Price</span>
                <input
                  inputMode="numeric"
                  value={formatKrw(t.price)}
                  onChange={(e) => update(t.id, { price: num(e.target.value) })}
                  className="h-12 w-full rounded-lg border border-line bg-surface-2 px-3 text-sm text-text focus:border-gold focus:outline-none"
                />
              </label>
              <label className="w-24 shrink-0">
                <span className="mb-2 block text-[11px] font-bold text-muted">Quantity</span>
                <input
                  inputMode="numeric"
                  value={t.quantity}
                  onChange={(e) => update(t.id, { quantity: num(e.target.value) })}
                  className="h-12 w-full rounded-lg border border-line bg-surface-2 px-3 text-sm text-text focus:border-gold focus:outline-none"
                />
              </label>
              <label className="w-28 shrink-0">
                <span className="mb-2 block text-[11px] font-bold text-muted">Max per order</span>
                <input
                  inputMode="numeric"
                  value={t.maxPerOrder}
                  onChange={(e) => update(t.id, { maxPerOrder: Math.max(1, num(e.target.value)) })}
                  className="h-12 w-full rounded-lg border border-line bg-surface-2 px-3 text-sm text-text focus:border-gold focus:outline-none"
                />
              </label>
              <button
                type="button"
                aria-label={`Delete ${t.name || "ticket type"}`}
                onClick={() => set(types.filter((x) => x.id !== t.id))}
                className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-line text-muted hover:border-danger/60 hover:text-danger focus-visible:focus-ring"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-line px-4 py-3 text-[11px] text-dim">
              <span className="flex items-center gap-4">
                <span className="flex items-center gap-2">
                  <CalendarDays size={12} aria-hidden /> {t.saleNote}
                </span>
                <span className="flex items-center gap-2">
                  <Check size={12} aria-hidden className="text-amber" />
                  <input
                    aria-label={`What ${t.name || "this ticket"} includes`}
                    value={t.perks}
                    onChange={(e) => update(t.id, { perks: e.target.value })}
                    placeholder="What buyers get"
                    className="w-52 bg-transparent text-dim placeholder:text-dim/60 focus:text-text focus:outline-none"
                  />
                </span>
              </span>
              <span className="flex items-center gap-3">
                Visible to buyers
                <Toggle label={`Show ${t.name || "ticket type"} to buyers`} checked={t.visible} onChange={(v) => update(t.id, { visible: v })} />
              </span>
            </div>
          </section>
        ))}

        <button
          type="button"
          onClick={add}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line text-[13px] font-bold text-text transition-colors hover:border-gold/60 focus-visible:focus-ring"
        >
          <Plus size={16} aria-hidden /> Add ticket type
        </button>
      </div>

      <div className="space-y-5 xl:sticky xl:top-6">
        <Panel className="p-5">
          <h2 className="text-base font-bold text-text">Capacity</h2>
          <p className="mt-4 text-[34px] font-bold leading-none text-text">{cap.tickets}</p>
          <div className="mt-2 flex items-center justify-between text-[11px] text-dim">
            <span>tickets for sale</span>
            <span>Venue limit {VENUE_LIMIT}</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-line" role="presentation">
            <div
              className={`h-full rounded-full ${over ? "bg-danger" : "bg-gradient-to-r from-amber to-gold"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {over && <p className="mt-2 text-xs text-danger">That&apos;s {cap.tickets - VENUE_LIMIT} over the venue limit.</p>}
          <ul className="mt-5 space-y-3">
            {types.map((t) => (
              <li key={t.id} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-muted">
                  <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: t.color }} />
                  {t.name || "Untitled"}
                </span>
                <span className="font-bold text-text">{t.quantity}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
            <span className="text-xs font-bold text-text">If every ticket sells</span>
            <span className="text-base font-bold text-text">{formatKrw(cap.revenue)}</span>
          </div>
        </Panel>

        <p className="flex items-start gap-3 rounded-xl border border-amber/40 bg-amber/10 p-4 text-xs leading-relaxed text-amber">
          <Info size={14} aria-hidden className="mt-0.5 shrink-0" />
          Prices here are the regular price. Add early-bird prices and promo codes on the next step.
        </p>
      </div>
    </div>
  );
}
