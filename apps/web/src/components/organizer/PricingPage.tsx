"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Info, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Badge } from "@/components/ui/StatusBadge";
import { Toggle } from "@/components/ui/Toggle";
import { formatKrw } from "@/lib/format";
import { pricePhases as seedPhases, promoCodes as seedCodes, type PricePhase, type PromoCode } from "@/lib/organizer";
import { useOrganizer } from "./OrganizerContext";
import { Dialog, EventPicker, OrgPageHeader, Panel } from "./ui";
import { Select } from "@/components/ui/Select";

const phaseBadge = {
  ended: { label: "Ended", tone: "neutral" as const },
  current: { label: "Current", tone: "success" as const },
  upcoming: { label: "Upcoming", tone: "warning" as const },
};

const money = (v: string) => Number(v.replace(/\D/g, "")) || 0;

export function PricingPage() {
  const { event } = useOrganizer();
  const [saved, setSaved] = useState(false);

  return (
    <>
      <OrgPageHeader
        crumbs={[{ label: event.title }, { label: "Pricing" }]}
        title="Pricing"
        actions={
          <>
            <EventPicker />
            <Button
              onClick={() => {
                // TODO: persist phases, discounts and codes through the API.
                setSaved(true);
              }}
            >
              {saved ? (
                <>
                  <Check size={16} aria-hidden /> Saved
                </>
              ) : (
                "Save prices"
              )}
            </Button>
          </>
        }
      />
      <PricingBody onChange={() => setSaved(false)} />
    </>
  );
}

/** Phases, group discount, promo codes and the buyer-price example. Reused by the event creation wizard. */
export function PricingBody({ onChange }: { onChange?: () => void }) {
  const [phases, setPhases] = useState<PricePhase[]>(seedPhases);
  const [codes, setCodes] = useState<PromoCode[]>(seedCodes);
  const [groupOn, setGroupOn] = useState(true);
  const [groupMin, setGroupMin] = useState(5);
  const [groupPct, setGroupPct] = useState(10);
  const [feeMode, setFeeMode] = useState<"cover" | "add">("cover");
  const [editing, setEditing] = useState<PricePhase | "new" | null>(null);
  const [newCode, setNewCode] = useState(false);

  const current = phases.find((p) => p.state === "current") ?? phases[0]!;
  const example = useMemo(() => {
    const qty = Math.max(groupMin, 1);
    const subtotal = qty * current.general;
    const group = groupOn && qty >= groupMin ? Math.round((subtotal * groupPct) / 100) : 0;
    const promo = codes.find((c) => c.code === "LANKA10");
    const afterGroup = subtotal - group;
    const code = promo ? (promo.kind === "percent" ? Math.round((afterGroup * promo.value) / 100) : promo.value) : 0;
    return { qty, subtotal, group, code, total: afterGroup - code };
  }, [current.general, groupMin, groupOn, groupPct, codes]);

  const dirty = () => onChange?.();

  return (
    <>
      <div className="grid items-start gap-5 xl:grid-cols-[1fr_21rem]">
        <div className="space-y-5">
          <Panel className="overflow-hidden">
            <div className="flex items-start justify-between gap-4 p-5">
              <div>
                <h2 className="text-lg font-bold text-text">Price phases</h2>
                <p className="mt-1 text-[11px] text-dim">Prices change automatically on these dates.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setEditing("new")}>
                <Plus size={14} aria-hidden /> Add phase
              </Button>
            </div>
            <ul>
              {phases.map((p) => (
                <li
                  key={p.id}
                  className={`flex flex-wrap items-center justify-between gap-4 border-t border-line px-5 py-4 ${
                    p.state === "current" ? "bg-gold/5" : ""
                  }`}
                >
                  <div className="min-w-0 leading-tight">
                    <p className="flex flex-wrap items-center gap-2 text-[13px] font-bold text-text">
                      {p.name}
                      <Badge tone={phaseBadge[p.state].tone} dot={p.state === "current"}>
                        {phaseBadge[p.state].label}
                      </Badge>
                    </p>
                    <p className="mt-1.5 text-[11px] text-dim">{p.when}</p>
                  </div>
                  <div className="flex items-center gap-5">
                    <PriceCell label="General" value={p.general} />
                    <PriceCell label="VIP" value={p.vip} />
                    <button
                      type="button"
                      aria-label={`Edit ${p.name}`}
                      onClick={() => setEditing(p)}
                      className="rounded-lg p-2 text-muted hover:text-gold focus-visible:focus-ring"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-text">Group discount</h2>
                <p className="mt-1 text-[11px] text-dim">Applied automatically at checkout.</p>
              </div>
              <Toggle label="Group discount" checked={groupOn} onChange={(v) => (setGroupOn(v), dirty())} />
            </div>
            <div className={`mt-5 grid gap-4 sm:grid-cols-3 ${groupOn ? "" : "pointer-events-none opacity-50"}`}>
              <Field
                label="When buying at least"
                value={`${groupMin} tickets`}
                inputMode="numeric"
                onChange={(e) => (setGroupMin(Math.max(2, money(e.target.value))), dirty())}
                disabled={!groupOn}
              />
              <Field
                label="Discount"
                value={`${groupPct}%`}
                inputMode="numeric"
                onChange={(e) => (setGroupPct(Math.min(90, money(e.target.value))), dirty())}
                disabled={!groupOn}
              />
              <div>
                <label htmlFor="applies" className="mb-2 block text-xs font-bold text-muted">
                  Applies to
                </label>
                <div className="relative">
                  <Select
                    id="applies"
                    disabled={!groupOn}
                    onChange={dirty}
                    className="h-12 w-full rounded-lg border border-line bg-surface px-4 text-sm text-text focus:border-gold focus:outline-none"
                  >
                    <option>General</option>
                    <option>VIP</option>
                    <option>All ticket types</option>
                  </Select>
                </div>
              </div>
            </div>
          </Panel>

          <Panel className="overflow-hidden">
            <div className="flex items-start justify-between gap-4 p-5">
              <div>
                <h2 className="text-lg font-bold text-text">Promo codes</h2>
                <p className="mt-1 text-[11px] text-dim">Share them with your community groups.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setNewCode(true)}>
                <Plus size={14} aria-hidden /> New code
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] text-left text-[13px]">
                <thead className="bg-surface-2 text-[10px] uppercase tracking-wider text-dim">
                  <tr>
                    {["Code", "Discount", "Used", "Valid until", "Status"].map((h) => (
                      <th key={h} scope="col" className="whitespace-nowrap px-5 py-3 font-bold">
                        {h}
                      </th>
                    ))}
                    <th scope="col" className="px-5">
                      <span className="sr-only">Copy</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map((c) => (
                    <PromoRow key={c.code} code={c} />
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel className="p-5">
            <h2 className="mb-4 text-base font-bold text-text">Booking fee</h2>
            <div role="radiogroup" aria-label="Booking fee" className="space-y-3">
              {[
                { id: "cover" as const, title: "I'll cover it", hint: "Buyers pay the ticket price only" },
                { id: "add" as const, title: "Add it to the ticket", hint: "Buyers see the fee at checkout" },
              ].map((o) => (
                <label
                  key={o.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                    feeMode === o.id ? "border-gold bg-gold/10" : "border-line hover:border-gold/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="fee"
                    checked={feeMode === o.id}
                    onChange={() => (setFeeMode(o.id), dirty())}
                    className="mt-0.5 size-4 shrink-0 accent-[#e8a83a]"
                  />
                  <span className="leading-tight">
                    <span className="block text-[13px] font-bold text-text">{o.title}</span>
                    <span className="mt-1 block text-[11px] text-dim">{o.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </Panel>

          <section className="rounded-xl border border-gold/40 bg-surface p-5" aria-label="What a buyer pays today">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted">What a buyer pays today</h2>
            <p className="mt-3 text-[11px] text-dim">
              Example: {example.qty} × General with code LANKA10
            </p>
            <dl className="mt-4 space-y-3 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-muted">
                  {example.qty} × General
                </dt>
                <dd className="text-text">{formatKrw(example.subtotal)}</dd>
              </div>
              {example.group > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted">Group discount {groupPct}%</dt>
                  <dd className="text-success">−{formatKrw(example.group)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted">LANKA10</dt>
                <dd className="text-success">−{formatKrw(example.code)}</dd>
              </div>
            </dl>
            <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
              <span className="text-[13px] font-bold text-text">Total</span>
              <span className="text-2xl font-bold text-text">{formatKrw(example.total)}</span>
            </div>
            <p className="mt-4 flex items-start gap-2 text-[11px] text-dim">
              <Info size={13} aria-hidden className="mt-0.5 shrink-0" /> Discounts stack: group first, then the code.
            </p>
          </section>
        </div>
      </div>

      <PhaseDialog
        phase={editing}
        onClose={() => setEditing(null)}
        onSave={(p) => {
          setPhases((prev) => (prev.some((x) => x.id === p.id) ? prev.map((x) => (x.id === p.id ? p : x)) : [...prev, p]));
          setEditing(null);
          dirty();
        }}
      />
      <CodeDialog
        open={newCode}
        onClose={() => setNewCode(false)}
        onSave={(c) => {
          setCodes((prev) => [...prev, c]);
          setNewCode(false);
          dirty();
        }}
      />
    </>
  );
}

function PriceCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-right leading-tight">
      <p className="text-[10px] text-dim">{label}</p>
      <p className="mt-1 text-[13px] font-bold text-text">{formatKrw(value)}</p>
    </div>
  );
}

function PromoRow({ code: c }: { code: PromoCode }) {
  const [copied, setCopied] = useState(false);
  const usedUp = c.used >= c.limit;
  return (
    <tr className="border-t border-line">
      <td className="px-5 py-4 font-mono text-xs font-bold text-gold">{c.code}</td>
      <td className="whitespace-nowrap px-5 py-4 text-muted">{c.kind === "percent" ? `${c.value}% off` : `${formatKrw(c.value)} off`}</td>
      <td className="px-5 py-4">
        <div className="w-28">
          <p className="mb-1.5 text-[11px] text-muted">
            {c.used} of {c.limit}
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-gradient-to-r from-amber to-gold" style={{ width: `${(c.used / c.limit) * 100}%` }} />
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-muted">{c.validUntil}</td>
      <td className="px-5 py-4">
        <Badge tone={usedUp ? "neutral" : "success"}>{usedUp ? "Used up" : "Active"}</Badge>
      </td>
      <td className="px-5 py-4 text-right">
        <button
          type="button"
          aria-label={`Copy code ${c.code}`}
          onClick={() => {
            navigator.clipboard
              .writeText(c.code)
              .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              })
              .catch(() => undefined);
          }}
          className="rounded-lg p-2 text-muted hover:text-gold focus-visible:focus-ring"
        >
          {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
        </button>
      </td>
    </tr>
  );
}

function PhaseDialog({
  phase,
  onClose,
  onSave,
}: {
  phase: PricePhase | "new" | null;
  onClose: () => void;
  onSave: (p: PricePhase) => void;
}) {
  const base: PricePhase =
    phase && phase !== "new"
      ? phase
      : { id: "", name: "", state: "upcoming", when: "", general: 30000, vip: 55000 };
  return (
    <Dialog open={phase !== null} onClose={onClose} title={phase === "new" ? "Add price phase" : "Edit price phase"}>
      {phase !== null && (
        <form
          key={phase === "new" ? "new" : phase.id}
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            onSave({
              ...base,
              id: base.id || `phase-${Date.now()}`,
              name: String(f.get("name") ?? "").trim() || "Untitled phase",
              when: String(f.get("when") ?? "").trim(),
              general: money(String(f.get("general") ?? "")),
              vip: money(String(f.get("vip") ?? "")),
            });
          }}
        >
          <Field label="Name" name="name" defaultValue={base.name} placeholder="Early bird" required />
          <Field label="When it applies" name="when" defaultValue={base.when} placeholder="1 Oct – 15 Oct 2026" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="General (₩)" name="general" inputMode="numeric" defaultValue={String(base.general)} />
            <Field label="VIP (₩)" name="vip" inputMode="numeric" defaultValue={String(base.vip)} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save phase</Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

function CodeDialog({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (c: PromoCode) => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="New promo code">
      {open && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const code = String(f.get("code") ?? "").trim().toUpperCase();
            if (!code) return;
            onSave({
              code,
              kind: f.get("kind") === "amount" ? "amount" : "percent",
              value: money(String(f.get("value") ?? "")),
              used: 0,
              limit: Math.max(1, money(String(f.get("limit") ?? "")) || 50),
              validUntil: String(f.get("until") ?? "").trim() || "13 Nov 2026",
            });
          }}
        >
          <Field label="Code" name="code" placeholder="SPRING10" required autoCapitalize="characters" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="kind" className="mb-2 block text-xs font-bold text-muted">
                Type
              </label>
              <Select
                id="kind"
                name="kind"
                className="h-12 w-full rounded-lg border border-line bg-surface px-3 text-sm text-text focus:border-gold focus:outline-none"
              >
                <option value="percent">Percent off</option>
                <option value="amount">Amount off (₩)</option>
              </Select>
            </div>
            <Field label="Value" name="value" inputMode="numeric" placeholder="10" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Max uses" name="limit" inputMode="numeric" placeholder="50" />
            <Field label="Valid until" name="until" placeholder="13 Nov 2026" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Create code</Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
