"use client";

import { Armchair, Tag } from "lucide-react";
import { SeatMapEditor } from "./SeatMapEditor";
import { TicketTypesEditor } from "./TicketTypesEditor";
import { useEventDraft } from "./EventDraft";

export function TicketsStep() {
  const { draft, patch } = useEventDraft();
  const mode = draft.sellMode;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="How tickets are sold" className="inline-flex gap-1 rounded-xl border border-line bg-surface p-1">
          {[
            { id: "tickets" as const, label: "Ticket types", Icon: Tag },
            { id: "seats" as const, label: "Seat map", Icon: Armchair },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={mode === id}
              onClick={() => patch({ sellMode: id })}
              className={`flex h-10 items-center gap-2 rounded-lg px-4 text-[13px] font-bold transition-colors focus-visible:focus-ring ${
                mode === id ? "border border-gold/60 bg-gold/15 text-gold" : "border border-transparent text-muted hover:text-text"
              }`}
            >
              <Icon size={14} aria-hidden /> {label}
            </button>
          ))}
        </div>
        {mode === "tickets" && (
          <p className="text-[11px] text-dim">Use a seat map instead if your venue has numbered seats.</p>
        )}
      </div>

      {mode === "tickets" ? <TicketTypesEditor /> : <SeatMapEditor />}
    </>
  );
}
