"use client";

import { useMemo, useState } from "react";
import { Accessibility, Ban, ChevronDown, Eye, EyeOff, GripVertical, MousePointer2, Plus, Redo2, Trash2, Undo2, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatKrw } from "@/lib/format";
import { newId, sectionColors, seatSectionTemplates, type SeatSection } from "@/lib/organizer";
import { Panel } from "../ui";
import { parseRows, sectionStats, useEventDraft, type SeatMapState } from "./EventDraft";

type Tool = "select" | "accessible" | "block";

const tools: { id: Tool; label: string; Icon: typeof MousePointer2 }[] = [
  { id: "select", label: "Select a row", Icon: MousePointer2 },
  { id: "accessible", label: "Mark accessible seats", Icon: Accessibility },
  { id: "block", label: "Block seats (not for sale)", Icon: Ban },
];

/** "1 → 16" order for a row of n seats: returns the label shown at each position, left to right. */
function labelsFor(section: SeatSection): number[] {
  const n = section.seatsPerRow;
  const base = Array.from({ length: n }, (_, i) => i + 1);
  if (section.numbering === "16 → 1") return [...base].reverse();
  if (section.numbering === "Odd / even") {
    const odds = base.filter((x) => x % 2 === 1);
    const evens = base.filter((x) => x % 2 === 0).reverse();
    return [...odds, ...evens];
  }
  return base;
}

export function SeatMapEditor() {
  const { draft, patch } = useEventDraft();
  const map = draft.seatMap;

  const [selectedId, setSelectedId] = useState(map.sections[1]?.id ?? map.sections[0]?.id ?? "");
  const [rowSel, setRowSel] = useState<string | null>("D");
  const [tool, setTool] = useState<Tool>("select");
  const [zoom, setZoom] = useState(1);
  const [preview, setPreview] = useState(false);
  const [history, setHistory] = useState<{ past: SeatMapState[]; future: SeatMapState[] }>({ past: [], future: [] });

  const commit = (next: SeatMapState) => {
    setHistory((h) => ({ past: [...h.past, map], future: [] }));
    patch({ seatMap: next });
  };
  const undo = () => {
    const prev = history.past.at(-1);
    if (!prev) return;
    setHistory((h) => ({ past: h.past.slice(0, -1), future: [...h.future, map] }));
    patch({ seatMap: prev });
  };
  const redo = () => {
    const next = history.future.at(-1);
    if (!next) return;
    setHistory((h) => ({ past: [...h.past, map], future: h.future.slice(0, -1) }));
    patch({ seatMap: next });
  };

  const selected = map.sections.find((s) => s.id === selectedId) ?? map.sections[0];

  const totals = useMemo(() => {
    const stats = map.sections.map((s) => sectionStats(s, map.blocked));
    return {
      seats: stats.reduce((n, s) => n + s.free, 0),
      revenue: stats.reduce((n, s) => n + s.revenue, 0),
    };
  }, [map.sections, map.blocked]);

  function toggle(list: "blocked" | "accessible", seat: string) {
    const cur = map[list];
    const next = cur.includes(seat) ? cur.filter((s) => s !== seat) : [...cur, seat];
    // A seat can't be both blocked and accessible.
    const other = list === "blocked" ? "accessible" : "blocked";
    commit({ ...map, [list]: next, [other]: map[other].filter((s) => s !== seat) });
  }

  function onSeat(section: SeatSection, row: string, seat: number) {
    const id = `${row}${seat}`;
    if (tool === "block") toggle("blocked", id);
    else if (tool === "accessible") toggle("accessible", id);
    else {
      setSelectedId(section.id);
      setRowSel(row);
    }
  }

  const updateSection = (id: string, p: Partial<SeatSection>) =>
    commit({ ...map, sections: map.sections.map((s) => (s.id === id ? { ...s, ...p } : s)) });

  function addSection() {
    const id = newId("section");
    const used = map.sections.flatMap((s) => parseRows(s.rows) ?? []);
    const last = used.sort().at(-1) ?? "@";
    const start = String.fromCharCode(Math.min(90, last.charCodeAt(0) + 1));
    const next: SeatSection = {
      id,
      name: `Section ${map.sections.length + 1}`,
      color: sectionColors[map.sections.length % sectionColors.length]!,
      price: 30000,
      rows: `${start} to ${start}`,
      seatsPerRow: 10,
      aisleAfter: 5,
      numbering: "1 → 16",
      seatType: "Single",
    };
    commit({ ...map, sections: [...map.sections, next] });
    setSelectedId(id);
    setRowSel(null);
  }

  function removeSection(id: string) {
    const rest = map.sections.filter((s) => s.id !== id);
    commit({ ...map, sections: rest });
    setSelectedId(rest[0]?.id ?? "");
    setRowSel(null);
  }

  function loadTemplate(name: string) {
    const sections = seatSectionTemplates[name] ?? [];
    setHistory((h) => ({ past: [...h.past, map], future: [] }));
    patch({
      seatMap: {
        template: name,
        sections,
        blocked: name === "Theatre with balcony" ? ["H8", "H9"] : [],
        accessible: name === "Theatre with balcony" ? ["A1", "A16"] : [],
      },
    });
    setSelectedId(sections[0]?.id ?? "");
    setRowSel(null);
  }

  const blockedLabel = map.blocked.length ? `${map.blocked.length} (${[...map.blocked].sort().join(", ")})` : "0";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-end gap-3 text-xs text-dim">
        <label htmlFor="template">Start from</label>
        <div className="relative">
          <select
            id="template"
            value={map.template}
            onChange={(e) => loadTemplate(e.target.value)}
            className="h-11 cursor-pointer appearance-none rounded-xl border border-line bg-surface pl-4 pr-10 text-[13px] font-bold text-text focus:border-gold focus:outline-none"
          >
            {Object.keys(seatSectionTemplates).map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <ChevronDown size={14} aria-hidden className="pointer-events-none absolute right-4 top-3.5 text-muted" />
        </div>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[1fr_20rem]">
        <Panel className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-3">
            <div className="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="Seat map tools">
              {tools.map(({ id, label, Icon }) => (
                <ToolButton key={id} label={label} active={tool === id} onClick={() => setTool(id)}>
                  <Icon size={16} />
                </ToolButton>
              ))}
              <ToolButton label="Add a section" onClick={addSection}>
                <Plus size={16} />
              </ToolButton>
              <span aria-hidden className="mx-1 h-6 w-px bg-line" />
              <ToolButton label="Undo" onClick={undo} disabled={history.past.length === 0}>
                <Undo2 size={16} />
              </ToolButton>
              <ToolButton label="Redo" onClick={redo} disabled={history.future.length === 0}>
                <Redo2 size={16} />
              </ToolButton>
            </div>
            <div className="flex items-center gap-1.5">
              <ToolButton label="Zoom out" onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.1).toFixed(1)))}>
                <ZoomOut size={16} />
              </ToolButton>
              <span className="w-12 text-center text-xs font-bold text-text">{Math.round(zoom * 100)}%</span>
              <ToolButton label="Zoom in" onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(1)))}>
                <ZoomIn size={16} />
              </ToolButton>
              <ToolButton label={preview ? "Back to editing" : "Preview as a buyer"} active={preview} onClick={() => setPreview((v) => !v)}>
                {preview ? <EyeOff size={16} /> : <Eye size={16} />}
              </ToolButton>
            </div>
          </div>

          <div className="overflow-x-auto p-4 sm:p-6">
            <div style={{ fontSize: `${zoom * 16}px` }} className="mx-auto w-max min-w-full">
              <div className="mx-auto mb-8 w-[68%]">
                <div className="h-1 rounded-full bg-gradient-to-r from-transparent via-amber to-transparent" />
                <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-widest text-dim">Stage</p>
              </div>

              {map.sections.length === 0 && (
                <p className="py-16 text-center text-sm text-muted">This map is empty. Use + to add a section.</p>
              )}

              {map.sections.map((s) => {
                const rows = parseRows(s.rows) ?? [];
                const stats = sectionStats(s, map.blocked);
                const labels = labelsFor(s);
                const accessibleCount = rows.reduce(
                  (n, r) => n + labels.filter((l) => map.accessible.includes(`${r}${l}`)).length,
                  0,
                );
                const couple = s.seatType === "Couple";
                return (
                  <section key={s.id} aria-label={`${s.name} section`} className="mb-6">
                    <header className="mb-2 flex items-center justify-between gap-4 text-[0.7em] font-bold text-dim">
                      <span className="flex items-center gap-2 uppercase tracking-wide">
                        <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="text-text">{s.name}</span>
                        <span className="font-normal">
                          {couple ? `${stats.total} couple seats · 2 people each` : `${stats.free} seats`}
                          {accessibleCount > 0 && !couple ? ` · ${accessibleCount} accessible` : ""}
                        </span>
                      </span>
                      <span className="font-normal">{formatKrw(s.price)}</span>
                    </header>

                    <div className="space-y-[0.4em]">
                      {rows.map((row) => {
                        const isRow = !preview && rowSel === row && selected?.id === s.id;
                        return (
                          <div
                            key={row}
                            className={`flex items-center justify-center gap-[0.6em] rounded-md px-[0.4em] py-[0.15em] ${
                              isRow ? "ring-1 ring-gold" : ""
                            }`}
                          >
                            <span className="w-[1em] text-center text-[0.7em] text-dim">{row}</span>
                            <div className="flex gap-[0.35em]">
                              {labels.map((n, i) => {
                                const id = `${row}${n}`;
                                const blocked = map.blocked.includes(id);
                                const acc = map.accessible.includes(id);
                                return (
                                  <span key={id} className="flex gap-[0.35em]">
                                    <button
                                      type="button"
                                      aria-label={`Seat ${id}${blocked ? ", blocked" : ""}${acc ? ", accessible" : ""}`}
                                      onClick={() => onSeat(s, row, n)}
                                      style={{ borderColor: blocked ? undefined : s.color, color: s.color }}
                                      className={`flex items-center justify-center rounded-md border font-bold transition-colors focus-visible:focus-ring ${
                                        couple ? "h-[1.75em] w-[3.1em]" : "size-[1.75em]"
                                      } text-[0.62em] ${
                                        blocked
                                          ? "border-dashed border-dim bg-black/40 text-dim"
                                          : "bg-black/30 hover:bg-white/10"
                                      }`}
                                    >
                                      {blocked ? "×" : acc ? <Accessibility size={11} aria-hidden /> : n}
                                    </button>
                                    {i + 1 === s.aisleAfter && <span aria-hidden className="w-[1.4em]" />}
                                  </span>
                                );
                              })}
                            </div>
                            <span className="w-[1em] text-center text-[0.7em] text-dim">{row}</span>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}

              <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[0.7em] text-dim">
                <li className="flex items-center gap-2">
                  <span className="size-4 rounded border border-dim" /> Available
                </li>
                <li className="flex items-center gap-2">
                  <Accessibility size={13} aria-hidden /> Accessible
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex size-4 items-center justify-center rounded border border-dashed border-dim">×</span> Blocked (not for sale)
                </li>
                {!preview && (
                  <li className="flex items-center gap-2">
                    <span className="size-4 rounded border border-gold" /> Selected row
                  </li>
                )}
              </ul>
            </div>
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel className="overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <h2 className="text-base font-bold text-text">Sections</h2>
              <Button variant="outline" size="sm" onClick={addSection}>
                <Plus size={14} aria-hidden /> Add section
              </Button>
            </div>
            <ul>
              {map.sections.map((s) => {
                const st = sectionStats(s, map.blocked);
                const rows = parseRows(s.rows);
                const active = s.id === selected?.id;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(s.id);
                        setRowSel(null);
                      }}
                      aria-current={active ? "true" : undefined}
                      className={`flex w-full items-center gap-3 border-t border-line px-4 py-3 text-left transition-colors focus-visible:focus-ring ${
                        active ? "bg-gold/10" : "hover:bg-surface-2"
                      }`}
                    >
                      <GripVertical size={13} aria-hidden className="shrink-0 text-dim" />
                      <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="min-w-0 flex-1 leading-tight">
                        <span className="block text-[13px] font-bold text-text">{s.name}</span>
                        <span className="mt-1 block text-[11px] text-dim">
                          {rows ? `${rows[0]}–${rows.at(-1)} · ${rows.length} rows × ${s.seatsPerRow}` : s.rows}
                        </span>
                      </span>
                      <span className="text-right leading-tight">
                        <span className="block text-[13px] font-bold text-text">{formatKrw(s.price)}</span>
                        <span className="mt-1 block text-[11px] text-dim">{st.free} seats</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Panel>

          {selected && <SectionForm key={selected.id} section={selected} onChange={(p) => updateSection(selected.id, p)} onDelete={() => removeSection(selected.id)} />}

          <Panel className="p-5">
            <dl className="space-y-3 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-muted">Seats for sale</dt>
                <dd className="font-bold text-text">{totals.seats}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Blocked</dt>
                <dd className="text-right text-text">{blockedLabel}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-line pt-3">
                <dt className="text-xs font-bold text-text">If every seat sells</dt>
                <dd className="text-base font-bold text-text">{formatKrw(totals.revenue)}</dd>
              </div>
            </dl>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function ToolButton({
  children,
  label,
  active,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`flex size-9 items-center justify-center rounded-lg border transition-colors focus-visible:focus-ring disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? "border-gold bg-gold/15 text-gold" : "border-line text-text hover:border-gold/50"
      }`}
    >
      {children}
    </button>
  );
}

function SectionForm({
  section: s,
  onChange,
  onDelete,
}: {
  section: SeatSection;
  onChange: (p: Partial<SeatSection>) => void;
  onDelete: () => void;
}) {
  const [rowsText, setRowsText] = useState(s.rows);
  const rowsValid = parseRows(rowsText) !== null;
  const box =
    "h-11 w-full rounded-lg border border-line bg-surface-2 px-3 text-sm text-text focus:border-gold focus:outline-none";
  const lab = "mb-2 block text-[11px] font-bold text-muted";

  return (
    <Panel className="border-gold/40 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-text">Edit section: {s.name}</h2>
        <button type="button" aria-label="Delete section" onClick={onDelete} className="rounded p-1 text-muted hover:text-danger">
          <Trash2 size={15} />
        </button>
      </div>

      <div className="mt-4 space-y-4">
        <label className="block">
          <span className={lab}>Section name</span>
          <input value={s.name} onChange={(e) => onChange({ name: e.target.value })} className={box} />
        </label>

        <div>
          <span className={lab}>Colour on the map</span>
          <div className="flex gap-3" role="radiogroup" aria-label="Colour on the map">
            {sectionColors.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={s.color === c}
                aria-label={`Colour ${c}`}
                onClick={() => onChange({ color: c })}
                style={{ backgroundColor: c }}
                className={`size-7 rounded-full focus-visible:focus-ring ${s.color === c ? "ring-2 ring-white ring-offset-2 ring-offset-surface" : ""}`}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={lab}>Price</span>
            <input
              inputMode="numeric"
              value={formatKrw(s.price)}
              onChange={(e) => onChange({ price: Number(e.target.value.replace(/\D/g, "")) || 0 })}
              className={box}
            />
          </label>
          <label className="block">
            <span className={lab}>Seat type</span>
            <select value={s.seatType} onChange={(e) => onChange({ seatType: e.target.value as SeatSection["seatType"] })} className={box}>
              <option>Single</option>
              <option>Couple</option>
            </select>
          </label>
          <label className="block">
            <span className={lab}>Rows</span>
            <input
              value={rowsText}
              aria-invalid={!rowsValid}
              onChange={(e) => {
                setRowsText(e.target.value);
                if (parseRows(e.target.value)) onChange({ rows: e.target.value.trim() });
              }}
              className={`${box} ${rowsValid ? "" : "border-danger"}`}
            />
          </label>
          <label className="block">
            <span className={lab}>Seats per row</span>
            <input
              inputMode="numeric"
              value={s.seatsPerRow}
              onChange={(e) => onChange({ seatsPerRow: Math.min(40, Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1)) })}
              className={box}
            />
          </label>
          <label className="block">
            <span className={lab}>Aisle after seat</span>
            <input
              inputMode="numeric"
              value={s.aisleAfter}
              onChange={(e) => onChange({ aisleAfter: Math.max(0, Number(e.target.value.replace(/\D/g, "")) || 0) })}
              className={box}
            />
          </label>
          <label className="block">
            <span className={lab}>Numbering</span>
            <select value={s.numbering} onChange={(e) => onChange({ numbering: e.target.value as SeatSection["numbering"] })} className={box}>
              <option>1 → 16</option>
              <option>16 → 1</option>
              <option>Odd / even</option>
            </select>
          </label>
        </div>
        {!rowsValid && <p className="text-xs text-danger">Write rows like &ldquo;A to H&rdquo;.</p>}
      </div>
    </Panel>
  );
}
