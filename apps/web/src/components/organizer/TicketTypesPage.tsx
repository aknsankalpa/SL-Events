"use client";

import { useMemo, useState } from "react";
import { Grid2x2, Hourglass, Minus, Pencil, Plus, Ticket, TrendingUp, TriangleAlert, X, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Badge } from "@/components/ui/StatusBadge";
import { Toggle } from "@/components/ui/Toggle";
import { formatKrw } from "@/lib/format";
import { orgTicketTypes, type OrgTicketType } from "@/lib/organizer";
import { useOrganizer } from "./OrganizerContext";
import { EventPicker, OrgPageHeader, Panel, StatCard } from "./ui";

const STATUS = {
  on_sale: { label: "On sale", tone: "success" as const },
  sold_out: { label: "Sold out", tone: "neutral" as const },
  paused: { label: "Paused", tone: "warning" as const },
  hidden: { label: "Hidden", tone: "neutral" as const },
};

function statusOf(t: OrgTicketType) {
  if (t.sold >= t.quantity) return STATUS.sold_out;
  if (t.paused) return STATUS.paused;
  if (t.hidden) return STATUS.hidden;
  return STATUS.on_sale;
}

export function TicketTypesPage() {
  const { event } = useOrganizer();
  const [types, setTypes] = useState<OrgTicketType[]>(orgTicketTypes);
  const [editingId, setEditingId] = useState<string | null>("vip");

  const editing = types.find((t) => t.id === editingId) ?? null;

  const totals = useMemo(() => {
    const forSale = types.reduce((n, t) => n + t.quantity, 0);
    const sold = types.reduce((n, t) => n + t.sold, 0);
    const held = types.reduce((n, t) => n + t.held, 0);
    return { forSale, sold, held, available: forSale - sold - held };
  }, [types]);

  const update = (id: string, patch: Partial<OrgTicketType>) =>
    setTypes((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  function addType() {
    const id = `type-${types.length + 1}-${Date.now() % 10000}`;
    setTypes((prev) => [
      ...prev,
      {
        id,
        name: "New ticket type",
        perk: "",
        summary: "",
        color: "bg-red-500",
        price: 0,
        quantity: 50,
        sold: 0,
        held: 0,
        salesStart: "1 Oct 2026",
        salesEnd: "13 Nov 2026",
        maxPerOrder: 6,
        hidden: false,
        paused: false,
      },
    ]);
    setEditingId(id);
  }

  const soldOut = types.filter((t) => t.sold >= t.quantity);

  return (
    <>
      <OrgPageHeader
        crumbs={[{ label: event.title }, { label: "Ticket types" }]}
        title="Ticket types"
        actions={
          <>
            <EventPicker />
            <Button onClick={addType}>
              <Plus size={16} aria-hidden /> Add ticket type
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tickets for sale" value={totals.forSale} Icon={Ticket} sub={`${types.length} ticket types`} />
        <StatCard
          label="Sold"
          value={totals.sold}
          Icon={CheckCheck}
          subTone="up"
          sub={
            <>
              <TrendingUp size={12} aria-hidden /> {Math.round((totals.sold / Math.max(1, totals.forSale)) * 100)}% of capacity
            </>
          }
        />
        <StatCard label="Held for payment" value={totals.held} Icon={Hourglass} sub="Released if unpaid in 24 h" />
        <StatCard
          label="Still available"
          value={totals.available}
          Icon={Grid2x2}
          subTone={soldOut.length ? "warn" : "default"}
          sub={
            soldOut.length ? (
              <>
                <TriangleAlert size={12} aria-hidden /> {soldOut.map((t) => t.name).join(", ")} is sold out
              </>
            ) : (
              "Across all ticket types"
            )
          }
        />
      </div>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[1fr_21rem]">
        <Panel className="overflow-hidden">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[40rem] text-left text-[13px]">
              <thead className="border-b border-line text-[10px] uppercase tracking-wider text-dim">
                <tr>
                  {["Ticket type", "Price", "Quantity", "Sold", "Availability", "Status"].map((h) => (
                    <th key={h} scope="col" className="px-4 py-3.5 font-bold first:pl-5">
                      {h}
                    </th>
                  ))}
                  <th scope="col" className="px-4">
                    <span className="sr-only">Edit</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {types.map((t) => {
                  const left = Math.max(0, t.quantity - t.sold - t.held);
                  const st = statusOf(t);
                  return (
                    <tr key={t.id} className={`border-b border-line last:border-b-0 ${t.id === editingId ? "bg-gold/5" : ""}`}>
                      <td className="py-4 pl-5 pr-4">
                        <span className="flex items-center gap-3">
                          <span aria-hidden className={`size-2.5 rounded-full ${t.color}`} />
                          <span className="leading-tight">
                            <span className="block font-bold text-text">{t.name}</span>
                            <span className="mt-1 block text-[11px] text-dim">{t.perk}</span>
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-4 font-bold text-text">{formatKrw(t.price)}</td>
                      <td className="px-4 py-4 text-muted">{t.quantity}</td>
                      <td className="px-4 py-4 text-muted">{t.sold}</td>
                      <td className="px-4 py-4">
                        <Availability type={t} left={left} />
                      </td>
                      <td className="px-4 py-4">
                        <Badge tone={st.tone} dot={st === STATUS.on_sale}>
                          {st.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          aria-label={`Edit ${t.name}`}
                          onClick={() => setEditingId(t.id)}
                          className="flex size-9 items-center justify-center rounded-lg border border-line text-muted hover:border-gold/50 hover:text-gold focus-visible:focus-ring"
                        >
                          <Pencil size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-line md:hidden">
            {types.map((t) => {
              const left = Math.max(0, t.quantity - t.sold - t.held);
              const st = statusOf(t);
              return (
                <li key={t.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex items-center gap-3">
                      <span aria-hidden className={`size-2.5 rounded-full ${t.color}`} />
                      <span className="leading-tight">
                        <span className="block text-sm font-bold text-text">{t.name}</span>
                        <span className="mt-1 block text-[11px] text-dim">{t.perk}</span>
                      </span>
                    </span>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted">
                    <span className="font-bold text-text">{formatKrw(t.price)}</span>
                    <span>
                      {t.sold} / {t.quantity} sold
                    </span>
                    <Button variant="outline" size="sm" className="border-line text-text hover:bg-surface-2" onClick={() => setEditingId(t.id)}>
                      Edit
                    </Button>
                  </div>
                  <div className="mt-3">
                    <Availability type={t} left={left} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>

        {editing && (
          <TypeEditor
            key={editing.id}
            type={editing}
            onClose={() => setEditingId(null)}
            onSave={(patch) => update(editing.id, patch)}
          />
        )}
      </div>
    </>
  );
}

function Availability({ type: t, left }: { type: OrgTicketType; left: number }) {
  const pct = Math.min(100, Math.round(((t.sold + t.held) / t.quantity) * 100));
  return (
    <div className="w-full min-w-32">
      <div className="mb-1.5 flex justify-between text-[11px] text-muted">
        <span>{t.held} held</span>
        <span className="font-bold text-text">{left} left</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-line" role="presentation">
        <div className="h-full rounded-full bg-gradient-to-r from-amber to-gold" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function TypeEditor({
  type,
  onClose,
  onSave,
}: {
  type: OrgTicketType;
  onClose: () => void;
  onSave: (patch: Partial<OrgTicketType>) => void;
}) {
  const [draft, setDraft] = useState(type);
  const [saved, setSaved] = useState(false);
  const floor = type.sold + type.held;
  const set = (patch: Partial<OrgTicketType>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setSaved(false);
  };

  return (
    <Panel className="border-gold/40 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-text">Edit: {type.name}</h2>
        <button type="button" aria-label="Close editor" onClick={onClose} className="rounded p-1 text-muted hover:text-text">
          <X size={16} />
        </button>
      </div>

      <form
        className="mt-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          // TODO: persist through the API; the server must also enforce the quantity floor.
          onSave({ ...draft, quantity: Math.max(floor, draft.quantity) });
          setSaved(true);
        }}
      >
        <Field label="Name" value={draft.name} onChange={(e) => set({ name: e.target.value })} />
        <Field label="What buyers get" value={draft.summary} onChange={(e) => set({ summary: e.target.value, perk: e.target.value })} />

        <div>
          <p className="mb-2 text-xs font-bold text-muted">Quantity</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-lg border border-line bg-surface-2" role="group" aria-label="Quantity">
              <button
                type="button"
                aria-label="Decrease quantity"
                disabled={draft.quantity <= floor}
                onClick={() => set({ quantity: Math.max(floor, draft.quantity - 1) })}
                className="flex size-10 items-center justify-center text-text disabled:text-dim"
              >
                <Minus size={14} />
              </button>
              <span className="w-12 text-center text-sm font-bold text-text">{draft.quantity}</span>
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => set({ quantity: draft.quantity + 1 })}
                className="flex size-10 items-center justify-center text-text"
              >
                <Plus size={14} />
              </button>
            </div>
            <p className="text-[11px] leading-snug text-dim">
              {type.sold} sold · {type.held} held. You can&apos;t go below {floor}.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
          <Field label="Sales start" value={draft.salesStart} onChange={(e) => set({ salesStart: e.target.value })} />
          <Field label="Sales end" value={draft.salesEnd} onChange={(e) => set({ salesEnd: e.target.value })} />
        </div>
        <Field
          label="Max per order"
          inputMode="numeric"
          value={draft.maxPerOrder}
          onChange={(e) => set({ maxPerOrder: Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1) })}
        />

        <div className="flex items-center justify-between gap-4 py-1">
          <div className="leading-tight">
            <p className="text-[13px] font-bold text-text">Hide from buyers</p>
            <p className="mt-1 text-[11px] text-dim">Keep for guest list or sponsors</p>
          </div>
          <Toggle label="Hide from buyers" checked={draft.hidden} onChange={(v) => set({ hidden: v })} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button type="submit" size="lg">
            {saved ? "Saved" : "Save"}
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="border-line text-text hover:bg-surface-2"
            onClick={() => {
              const paused = !draft.paused;
              setDraft((d) => ({ ...d, paused }));
              onSave({ paused });
            }}
          >
            {draft.paused ? "Resume sales" : "Pause sales"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
