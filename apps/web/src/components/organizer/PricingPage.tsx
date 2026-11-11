"use client";

import { useState } from "react";
import { Check, Clock, Info, Tag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { formatKrw } from "@/lib/format";
import type { EventDraft } from "@/lib/organizer";
import { useOrganizer } from "./OrganizerContext";
import { EventPicker, OrgPageHeader, Panel } from "./ui";

type Discounts = NonNullable<EventDraft["discounts"]>;
const NONE: Discounts = { earlyBird: false, promoCodes: false };

/** The Pricing page: the selected event's prices and its discount choices. */
export function PricingPage() {
  const { event, saveEvent } = useOrganizer();
  const draft = event.draft;
  return (
    <>
      <OrgPageHeader crumbs={[{ label: event.title }, { label: "Pricing" }]} title="Pricing" actions={<EventPicker />} />
      {draft ? (
        <PricingEditor key={event.id} draft={draft} onSave={(next) => saveEvent(event.id, next)} />
      ) : (
        <Panel className="p-10 text-center text-sm text-muted">Create an event to set its prices.</Panel>
      )}
    </>
  );
}

function PricingEditor({ draft, onSave }: { draft: EventDraft; onSave: (d: EventDraft) => Promise<{ ok: true } | { ok: false; error: string }> }) {
  const [discounts, setDiscounts] = useState<Discounts>(draft.discounts ?? NONE);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string>();
  const dirty = JSON.stringify(discounts) !== JSON.stringify(draft.discounts ?? NONE);

  async function save() {
    setState("saving");
    setError(undefined);
    const result = await onSave({ ...draft, discounts });
    if (result.ok) setState("saved");
    else {
      setState("idle");
      setError(result.error);
    }
  }

  return (
    <PricingBody
      draft={draft}
      discounts={discounts}
      onChange={(d) => {
        setDiscounts(d);
        setState("idle");
      }}
      footer={
        <>
          <Button onClick={() => void save()} disabled={!dirty || state === "saving"} className="w-full">
            {state === "saving" ? (
              "Saving…"
            ) : state === "saved" && !dirty ? (
              <>
                <Check size={16} aria-hidden /> Saved
              </>
            ) : (
              "Save choices"
            )}
          </Button>
          {error && (
            <p role="alert" className="mt-2 text-xs font-bold text-danger">
              {error}
            </p>
          )}
        </>
      }
    />
  );
}

/**
 * Regular prices (from the ticket types or the seat map) and the organizer's choice about discounts. Early-bird prices
 * and promo codes aren't available yet: the choice is saved with the event, and buyers pay the regular price.
 * Reused by step 3 of the event creation wizard.
 */
export function PricingBody({
  draft,
  discounts,
  onChange,
  footer,
}: {
  draft: EventDraft;
  discounts: Discounts;
  onChange: (d: Discounts) => void;
  footer?: React.ReactNode;
}) {
  const seats = draft.sellMode === "seats";
  const prices = seats
    ? draft.seatMap.sections.map((s) => ({ id: s.id, name: s.name, price: s.price, color: s.color }))
    : draft.ticketTypes.filter((t) => t.visible).map((t) => ({ id: t.id, name: t.name || "Untitled", price: t.price, color: t.color }));

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[1fr_21rem]">
      <div className="space-y-5">
        <Panel className="overflow-hidden">
          <div className="p-5">
            <h2 className="text-lg font-bold text-text">Regular prices</h2>
            <p className="mt-1 text-[11px] text-dim">
              {seats ? "Set on the seat map, one price per section." : "Set with the ticket types."} Every buyer pays these.
            </p>
          </div>
          <ul>
            {prices.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-4 border-t border-line px-5 py-3.5 text-[13px]">
                <span className="flex items-center gap-2 text-text">
                  <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                  {p.name}
                </span>
                <span className="font-bold text-text">{p.price === 0 ? "Free" : formatKrw(p.price)}</span>
              </li>
            ))}
            {prices.length === 0 && <li className="border-t border-line px-5 py-6 text-center text-sm text-muted">No {seats ? "sections" : "ticket types"} yet.</li>}
          </ul>
        </Panel>

        <Panel className="p-5">
          <h2 className="text-lg font-bold text-text">Discounts for this event</h2>
          <p className="mt-1 text-[11px] text-dim">Tell us what you would like to offer. You can change your mind later.</p>
          <div className="mt-5 divide-y divide-line">
            <ChoiceRow
              Icon={Clock}
              title="Early-bird prices"
              hint="Lower prices for people who book early, ending on a date you choose."
              checked={discounts.earlyBird}
              onChange={(v) => onChange({ ...discounts, earlyBird: v })}
            />
            <ChoiceRow
              Icon={Tag}
              title="Promo codes"
              hint="Codes you share with community groups for money off."
              checked={discounts.promoCodes}
              onChange={(v) => onChange({ ...discounts, promoCodes: v })}
            />
          </div>
          <p className="mt-4 flex items-start gap-2 rounded-lg border border-amber/40 bg-amber/10 p-3 text-xs leading-relaxed text-text">
            <Info size={14} aria-hidden className="mt-0.5 shrink-0 text-amber" />
            Early-bird prices and promo codes aren&apos;t available yet. Your choice is saved with the event, and until they are, every buyer pays the regular price.
          </p>
        </Panel>
      </div>

      <div className="space-y-5">
        <Panel className="p-5">
          <h2 className="text-base font-bold text-text">Booking fee</h2>
          <p className="mt-2 text-[12px] leading-relaxed text-muted">There is no booking fee at the moment. Buyers pay exactly the ticket price.</p>
        </Panel>
        {footer && <Panel className="p-5">{footer}</Panel>}
      </div>
    </div>
  );
}

function ChoiceRow({ Icon, title, hint, checked, onChange }: { Icon: typeof Clock; title: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3 leading-tight">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold">
          <Icon size={15} aria-hidden />
        </span>
        <span>
          <span className="block text-[13px] font-bold text-text">I&apos;d like {title.toLowerCase()}</span>
          <span className="mt-1 block text-[11px] text-dim">{hint}</span>
        </span>
      </div>
      <Toggle label={title} checked={checked} onChange={onChange} />
    </div>
  );
}
