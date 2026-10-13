"use client";

import { useState } from "react";
import { Check, Lock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { defaultSettings, lockedSettings, type OpsSettings } from "@/lib/operations";
import { Panel } from "../ui";

type Props = {
  settings: OpsSettings;
  onSave: (next: OpsSettings) => void;
};

type ToggleKey = "manualCheckIn" | "allowReentry" | "showGuestNames" | "studentIdCheck" | "soundFeedback";

const toggles: { key: ToggleKey; label: string; hint: string }[] = [
  { key: "manualCheckIn", label: "Allow check-in by hand", hint: "Gate leads and help desk can admit someone from the attendee list." },
  { key: "allowReentry", label: "Allow re-entry", hint: "Guests who step out can scan back in. Off means one entry per ticket." },
  { key: "showGuestNames", label: "Show guest names on the scanner", hint: "Turn off if you'd rather staff only see Admit or Refuse." },
  { key: "studentIdCheck", label: "Remind staff to check student ID", hint: "Shows a prompt when a Student ticket is scanned." },
  { key: "soundFeedback", label: "Sound and vibration on scan", hint: "A short tone for admit and a different one for refused." },
];

const selectCls =
  "h-11 w-full rounded-lg border border-line bg-surface-2 px-3 text-sm text-text focus:border-gold focus:outline-none";

export function EventDaySettings({ settings, onSave }: Props) {
  const [draft, setDraft] = useState(settings);
  const [saved, setSaved] = useState(false);

  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);
  const set = (p: Partial<OpsSettings>) => {
    setDraft((d) => ({ ...d, ...p }));
    setSaved(false);
  };

  return (
    <Panel className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-text">Event-day settings</h2>
          <p className="mt-1 text-[11px] text-dim">The rules your door team works to. Changes apply to every scanner at once.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setDraft(defaultSettings);
            setSaved(false);
          }}
          className="flex items-center gap-1.5 text-xs font-bold text-muted hover:text-gold"
        >
          <RotateCcw size={13} aria-hidden /> Reset to defaults
        </button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs font-bold text-muted">Check-in opens</span>
          <input
            type="time"
            value={draft.checkInOpens}
            onChange={(e) => set({ checkInOpens: e.target.value })}
            className={selectCls}
          />
          <span className="mt-1.5 block text-[11px] text-dim">Scanners refuse tickets before this time.</span>
        </label>

        <div>
          <span className="mb-2 block text-xs font-bold text-muted">Late entry</span>
          <div className="flex gap-2">
            <select
              aria-label="Late entry"
              value={draft.lateCutoff === "none" ? "none" : "at"}
              onChange={(e) => set({ lateCutoff: e.target.value === "none" ? "none" : "20:30" })}
              className={`${selectCls} flex-1`}
            >
              <option value="none">No cut-off</option>
              <option value="at">Refuse after…</option>
            </select>
            {draft.lateCutoff !== "none" && (
              <input
                type="time"
                aria-label="Late entry cut-off time"
                value={draft.lateCutoff}
                onChange={(e) => set({ lateCutoff: e.target.value || "20:30" })}
                className={`${selectCls} w-36`}
              />
            )}
          </div>
          <span className="mt-1.5 block text-[11px] text-dim">Useful when the doors close after the opening act.</span>
        </div>

        <label className="block">
          <span className="mb-2 block text-xs font-bold text-muted">Scanner link works until</span>
          <select
            value={draft.scannerLinkExpiry}
            onChange={(e) => set({ scannerLinkExpiry: e.target.value as OpsSettings["scannerLinkExpiry"] })}
            className={selectCls}
          >
            <option value="midnight">Midnight on the event day</option>
            <option value="dawn">6 AM the next morning</option>
            <option value="event_end">When the event ends</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-bold text-muted">Alert me when attendance reaches</span>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={50}
              max={100}
              step={5}
              value={draft.capacityAlertPct}
              onChange={(e) => set({ capacityAlertPct: Number(e.target.value) })}
              className="h-2 flex-1 cursor-pointer accent-[#e8a83a]"
            />
            <span className="w-12 text-right text-sm font-bold text-text">{draft.capacityAlertPct}%</span>
          </div>
          <span className="mt-1.5 block text-[11px] text-dim">Of tickets sold. You get a notification once.</span>
        </label>
      </div>

      <ul className="mt-6 divide-y divide-line rounded-xl border border-line">
        {toggles.map((t) => (
          <li key={t.key} className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0 leading-tight">
              <p className="text-[13px] font-bold text-text">{t.label}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-dim">{t.hint}</p>
            </div>
            <Toggle label={t.label} checked={draft[t.key]} onChange={(v) => set({ [t.key]: v })} />
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          disabled={!dirty}
          onClick={() => {
            onSave(draft);
            setSaved(true);
          }}
        >
          Save settings
        </Button>
        {saved && (
          <span role="status" className="flex items-center gap-1.5 text-xs text-success">
            <Check size={14} aria-hidden /> Saved. Scanners pick this up straight away.
          </span>
        )}
        {dirty && !saved && <span className="text-xs text-amber">You have unsaved changes.</span>}
      </div>

      <section className="mt-7 border-t border-line pt-6" aria-label="Managed by SL Events">
        <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-dim">
          <Lock size={12} aria-hidden /> Managed by SL Events
        </h3>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {lockedSettings.map((l) => (
            <li key={l.label} className="rounded-lg border border-line bg-surface-2 p-3.5">
              <p className="text-xs font-bold text-text">{l.label}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-dim">{l.reason}</p>
            </li>
          ))}
        </ul>
      </section>
    </Panel>
  );
}
