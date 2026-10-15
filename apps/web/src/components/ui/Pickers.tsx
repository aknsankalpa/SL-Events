"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { REFERENCE_DATE } from "@/lib/organizer";
import { PopoverPanel, placePopover, type PopoverPlacement } from "./Popover";

type ChangeEventLike = { target: { value: string; name?: string } };

type PickerProps = {
  /** "YYYY-MM-DD" for dates, "HH:MM" (24 hour) for times. */
  value?: string;
  defaultValue?: string;
  onChange?: (e: ChangeEventLike) => void;
  name?: string;
  id?: string;
  disabled?: boolean;
  /** Classes for the closed field, like a native input. */
  className?: string;
  placeholder?: string;
  required?: boolean;
  "aria-label"?: string;
  "aria-describedby"?: string;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW = ["S", "M", "T", "W", "T", "F", "S"];
const pad = (n: number) => String(n).padStart(2, "0");

/** Shared plumbing: works controlled or uncontrolled, opens next to the trigger, closes on pick or Escape. */
function usePicker({ value, defaultValue, onChange, name }: Pick<PickerProps, "value" | "defaultValue" | "onChange" | "name">, height: number, width: number) {
  const [inner, setInner] = useState(defaultValue ?? "");
  const current = value !== undefined ? value : inner;
  const trigger = useRef<HTMLButtonElement>(null);
  const [placement, setPlacement] = useState<PopoverPlacement | null>(null);
  const close = useCallback(() => setPlacement(null), []);

  const open = () => {
    if (trigger.current) setPlacement(placePopover(trigger.current, { height, width }));
  };
  const set = (next: string) => {
    if (value === undefined) setInner(next);
    onChange?.({ target: { value: next, name } });
  };
  return { current, set, trigger, placement, open, close };
}

/* ---------------------------------- date ---------------------------------- */

function parseDate(s: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? { y: Number(m[1]), m: Number(m[2]) - 1, d: Number(m[3]) } : null;
}

export function formatPickedDate(s: string): string {
  const p = parseDate(s);
  if (!p) return "";
  const dow = DAYS[new Date(Date.UTC(p.y, p.m, p.d)).getUTCDay()]!;
  return `${dow}, ${p.d} ${MONTHS[p.m]} ${p.y}`;
}

export function DatePicker({
  value,
  defaultValue,
  onChange,
  name,
  id,
  disabled,
  className = "",
  placeholder = "Select a date",
  required,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
}: PickerProps) {
  const { current, set, trigger, placement, open, close } = usePicker({ value, defaultValue, onChange, name }, 372, 296);
  const label = formatPickedDate(current);

  return (
    <>
      <button
        ref={trigger}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={placement !== null}
        onClick={() => (placement ? close() : open())}
        className={`flex items-center text-left disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
      >
        <span className={`truncate ${label ? "" : "text-dim"}`}>{label || placeholder}</span>
      </button>
      {name && <input type="hidden" name={name} value={current} />}
      {placement && (
        <PopoverPanel anchor={trigger} placement={placement} onClose={close} role="dialog" label="Choose a date" className="p-4">
          <CalendarPanel
            selected={current}
            canClear={!required}
            onPick={(v) => {
              set(v);
              close();
              trigger.current?.focus();
            }}
          />
        </PopoverPanel>
      )}
    </>
  );
}

function CalendarPanel({ selected, canClear, onPick }: { selected: string; canClear: boolean; onPick: (v: string) => void }) {
  const base = parseDate(selected) ?? parseDate(REFERENCE_DATE)!;
  const [view, setView] = useState({ y: base.y, m: base.m });
  const grid = useRef<HTMLDivElement>(null);

  const monthStart = new Date(Date.UTC(view.y, view.m, 1));
  const daysInMonth = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const lead = monthStart.getUTCDay();
  const cells = Array.from({ length: Math.ceil((lead + daysInMonth) / 7) * 7 }, (_, i) => {
    const day = i - lead + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });
  const iso = (day: number) => `${view.y}-${pad(view.m + 1)}-${pad(day)}`;
  const label = monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const shift = (delta: number) => {
    const d = new Date(Date.UTC(view.y, view.m + delta, 1));
    setView({ y: d.getUTCFullYear(), m: d.getUTCMonth() });
  };

  // Which day takes the single tab stop: the picked day, else today, else the 1st.
  const stopDay =
    cells.find((d) => d && iso(d) === selected) ?? cells.find((d) => d && iso(d) === REFERENCE_DATE) ?? 1;

  useEffect(() => {
    grid.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
    // Focus once when the panel opens.
  }, []);

  function onGridKey(e: KeyboardEvent<HTMLDivElement>) {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key as string];
    if (!step) return;
    const day = Number((e.target as HTMLElement).dataset.day);
    if (!day) return;
    e.preventDefault();
    const next = day + step;
    if (next >= 1 && next <= daysInMonth) grid.current?.querySelector<HTMLElement>(`[data-day="${next}"]`)?.focus();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-text" aria-live="polite">
          {label}
        </p>
        <div className="flex gap-1.5">
          {[
            { d: -1, l: "Previous month", I: ChevronLeft },
            { d: 1, l: "Next month", I: ChevronRight },
          ].map(({ d, l, I }) => (
            <button
              key={l}
              type="button"
              aria-label={l}
              onClick={() => shift(d)}
              className="flex size-8 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-gold/50 hover:text-gold focus-visible:focus-ring"
            >
              <I size={14} />
            </button>
          ))}
        </div>
      </div>

      <div ref={grid} onKeyDown={onGridKey} className="mt-4 grid gap-y-1 text-center" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
        {DOW.map((d, i) => (
          <span key={i} aria-hidden className="pb-2 text-[10px] font-bold text-dim">
            {d}
          </span>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <span key={i} />;
          const date = iso(day);
          const isSelected = date === selected;
          const today = date === REFERENCE_DATE;
          return (
            <button
              key={i}
              type="button"
              data-day={day}
              tabIndex={day === stopDay ? 0 : -1}
              aria-label={formatPickedDate(date)}
              aria-pressed={isSelected}
              aria-current={today ? "date" : undefined}
              onClick={() => onPick(date)}
              className={`mx-auto flex size-9 items-center justify-center rounded-full text-xs transition-colors focus-visible:focus-ring ${
                isSelected
                  ? "bg-gradient-to-b from-gold to-amber font-bold text-ink"
                  : today
                    ? "border border-gold/70 font-bold text-gold hover:bg-gold/10"
                    : "text-muted hover:bg-surface-2 hover:text-text"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-xs font-bold">
        <button type="button" onClick={() => onPick(REFERENCE_DATE)} className="text-gold hover:brightness-110 focus-visible:focus-ring">
          Today
        </button>
        {canClear && selected && (
          <button type="button" onClick={() => onPick("")} className="text-muted hover:text-text focus-visible:focus-ring">
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------- time ---------------------------------- */

function parseTime(s: string) {
  const m = /^(\d{1,2}):(\d{2})/.exec(s);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h < 24 && min < 60 ? { h, min } : null;
}

export function formatPickedTime(s: string): string {
  const t = parseTime(s);
  if (!t) return "";
  return `${t.h % 12 || 12}:${pad(t.min)} ${t.h >= 12 ? "PM" : "AM"}`;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

export function TimePicker({
  value,
  defaultValue,
  onChange,
  name,
  id,
  disabled,
  className = "",
  placeholder = "Select a time",
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
}: PickerProps) {
  const { current, set, trigger, placement, open, close } = usePicker({ value, defaultValue, onChange, name }, 300, 264);
  const label = formatPickedTime(current);

  return (
    <>
      <button
        ref={trigger}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={placement !== null}
        onClick={() => (placement ? close() : open())}
        className={`flex items-center text-left disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
      >
        <span className={`truncate ${label ? "" : "text-dim"}`}>{label || placeholder}</span>
      </button>
      {name && <input type="hidden" name={name} value={current} />}
      {placement && (
        <PopoverPanel anchor={trigger} placement={placement} onClose={close} role="dialog" label="Choose a time" className="p-3">
          <TimePanel
            value={current}
            onPick={set}
            onDone={() => {
              close();
              trigger.current?.focus();
            }}
          />
        </PopoverPanel>
      )}
    </>
  );
}

function TimePanel({ value, onPick, onDone }: { value: string; onPick: (v: string) => void; onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const t = parseTime(value);
  const hour12 = t ? t.h % 12 || 12 : null;
  const pm = t ? t.h >= 12 : null;

  // Bring the picked hour and minute into view when the panel opens.
  useEffect(() => {
    root.current?.querySelectorAll<HTMLElement>('[data-picked="true"]').forEach((el) => {
      const col = el.parentElement;
      if (col) col.scrollTop = el.offsetTop - col.clientHeight / 2 + el.offsetHeight / 2;
    });
  }, []);

  /** Builds "HH:MM" from the parts, starting from noon when nothing has been picked yet. */
  const emit = (parts: { hour12?: number; min?: number; pm?: boolean }) => {
    const h12 = parts.hour12 ?? hour12 ?? 12;
    const isPm = parts.pm ?? pm ?? true;
    const h24 = (h12 % 12) + (isPm ? 12 : 0);
    onPick(`${pad(h24)}:${pad(parts.min ?? t?.min ?? 0)}`);
  };

  const cell = (picked: boolean) =>
    `flex h-9 w-full items-center justify-center rounded-lg text-[13px] transition-colors focus-visible:focus-ring ${
      picked ? "bg-gradient-to-b from-gold to-amber font-bold text-ink" : "text-muted hover:bg-surface-2 hover:text-text"
    }`;

  return (
    <div ref={root}>
      <div className="grid grid-cols-3 gap-2 text-center">
        <p className="text-[10px] font-bold uppercase tracking-wider text-dim">Hour</p>
        <p className="text-[10px] font-bold uppercase tracking-wider text-dim">Minute</p>
        <p className="text-[10px] font-bold uppercase tracking-wider text-dim">AM / PM</p>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <div className="relative max-h-48 space-y-1 overflow-y-auto pr-0.5" role="listbox" aria-label="Hour">
          {HOURS.map((h) => (
            <button key={h} type="button" role="option" aria-selected={h === hour12} data-picked={h === hour12} onClick={() => emit({ hour12: h })} className={cell(h === hour12)}>
              {h}
            </button>
          ))}
        </div>
        <div className="relative max-h-48 space-y-1 overflow-y-auto pr-0.5" role="listbox" aria-label="Minute">
          {MINUTES.map((m) => (
            <button key={m} type="button" role="option" aria-selected={t?.min === m} data-picked={t?.min === m} onClick={() => emit({ min: m })} className={cell(t?.min === m)}>
              {pad(m)}
            </button>
          ))}
        </div>
        <div className="space-y-1" role="listbox" aria-label="AM or PM">
          {(["AM", "PM"] as const).map((p) => (
            <button key={p} type="button" role="option" aria-selected={pm === (p === "PM")} onClick={() => emit({ pm: p === "PM" })} className={cell(pm === (p === "PM"))}>
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 flex justify-end border-t border-line pt-3">
        <button type="button" onClick={onDone} className="text-xs font-bold text-gold hover:brightness-110 focus-visible:focus-ring">
          Done
        </button>
      </div>
    </div>
  );
}
