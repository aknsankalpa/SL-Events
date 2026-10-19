"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Accessibility,
  Ban,
  Eye,
  EyeOff,
  Hash,
  ImagePlus,
  Layers,
  Loader2,
  Minus,
  MousePointer2,
  Plus,
  Redo2,
  ScanSearch,
  SquareDashedMousePointer,
  Trash2,
  TriangleAlert,
  Undo2,
  Wand2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatKrw } from "@/lib/format";
import {
  seatMapSectionStats,
  seatSectionTemplates,
  unassignedSeats,
  type DetectionSettings,
  type LayoutSeat,
  type SeatLayout,
  type SeatSection,
} from "@/lib/organizer";
import { MIN_SEATS } from "@/lib/seatDetect";
import {
  defaultSections,
  cleanPlanImage,
  detectLayoutSeats,
  emptyLayout,
  findStrayDots,
  newSeatUid,
  readPlanFile,
  renumber,
  sectionPalette,
} from "@/lib/seatLayout";
import { strayReasonLabel, type StrayReason } from "@/lib/strayDots";
import { Dialog, Panel } from "../ui";
import { useEventDraft } from "./EventDraft";
import { Select } from "@/components/ui/Select";

type Tool = "select" | "area" | "add";
/** How a click or a dragged box changes the selection: start a new one, add to it, or take seats out of it. */
type SelMode = "replace" | "add" | "remove";
const SECTION_NAMES = ["Front row", "Middle", "Back row", "Balcony", "VIP"];
type Snapshot = { layout: SeatLayout; sections: SeatSection[] };

const MAX_BYTES = 12 * 1024 * 1024;

/* ------------------------------------------------------------------------------------------------------------- */
/* Upload banner: shown above the grid builder until a plan has been uploaded                                       */
/* ------------------------------------------------------------------------------------------------------------- */

export function SeatPlanUpload() {
  const { draft, patch } = useEventDraft();
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [dragging, setDragging] = useState(false);
  const [empty, setEmpty] = useState<{ imageUrl: string; width: number; height: number } | null>(null);

  async function handle(file?: File) {
    if (!file) return;
    setError(undefined);
    setEmpty(null);
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return setError("Use a PNG, JPG or WebP picture of the seating plan.");
    if (file.size > MAX_BYTES) return setError("That picture is larger than 12 MB. Export a smaller version and try again.");

    setBusy(true);
    try {
      const plan = await readPlanFile(file);
      const sections = defaultSections();
      const { seats } = await detectLayoutSeats(plan.imageUrl, emptyLayout(plan).settings, sections[0]!.id);
      if (seats.length < MIN_SEATS) {
        setEmpty(plan);
        setError(
          "We couldn't find a repeating seat shape in that picture. Seats should be separate dots, squares or circles that are clearly different from the background.",
        );
        return;
      }
      patch({ seatMap: { ...draft.seatMap, template: "Uploaded plan", sections, blocked: [], accessible: [], layout: emptyLayout(plan, seats) } });
    } catch {
      setError("That picture couldn't be read. Try exporting it as a PNG or JPG.");
    } finally {
      setBusy(false);
    }
  }

  function placeByHand() {
    if (!empty) return;
    const sections = defaultSections();
    patch({ seatMap: { ...draft.seatMap, template: "Uploaded plan", sections, blocked: [], accessible: [], layout: emptyLayout(empty, []) } });
  }

  return (
    <Panel className="mb-5 p-5 sm:p-6">
      <div className="flex flex-wrap items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold">
          <Wand2 size={20} aria-hidden />
        </span>
        <div className="min-w-0 flex-1 basis-64">
          <h2 className="text-base font-bold text-text">Build it from a picture</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            Upload an image of your venue&apos;s seating plan. We find every seat, group them into rows and number them. You then
            review the chart and set up your sections and prices.
          </p>
        </div>
        <label
          htmlFor={inputId}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void handle(e.dataTransfer.files[0]);
          }}
          className={`flex w-full cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-dashed px-5 py-6 text-center transition-colors sm:w-72 ${
            dragging ? "border-gold bg-gold/10" : "border-amber/40 hover:border-gold/70"
          }`}
        >
          {busy ? (
            <Loader2 size={20} aria-hidden className="animate-spin text-gold" />
          ) : (
            <ImagePlus size={20} aria-hidden className="text-gold" />
          )}
          <span className="text-[13px] font-bold text-text">{busy ? "Finding seats…" : "Upload your seating plan"}</span>
          <span className="text-[11px] text-dim">PNG, JPG or WebP · up to 12 MB</span>
          <input
            id={inputId}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              void handle(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {error && (
        <div role="alert" className="mt-4 rounded-lg border border-amber/40 bg-amber/10 p-4 text-xs leading-relaxed text-text">
          <p>{error}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
            <li>Use a clean, top-down plan with one mark per seat.</li>
            <li>Dark seats on a light background, or the reverse, work best.</li>
            <li>Crop away legends and decoration where you can.</li>
          </ul>
          {empty && (
            <Button size="sm" variant="outline" className="mt-3 border-line text-text hover:bg-surface-2" onClick={placeByHand}>
              Use this picture and place seats by hand
            </Button>
          )}
        </div>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------------------------------------------------- */
/* Builder                                                                                                          */
/* ------------------------------------------------------------------------------------------------------------- */

export function ImageSeatMapBuilder() {
  const { draft, patch } = useEventDraft();
  const map = draft.seatMap;
  const layout = map.layout!;
  const sections = map.sections;

  const [tool, setTool] = useState<Tool>("select");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState(1);
  const [showImage, setShowImage] = useState(true);
  const [showLabels, setShowLabels] = useState(false);
  const [history, setHistory] = useState<{ past: Snapshot[]; future: Snapshot[] }>({ past: [], future: [] });
  const [settings, setSettings] = useState<DetectionSettings>(layout.settings);
  const [detectStale, setDetectStale] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string>();
  const [confirm, setConfirm] = useState<"redetect" | "grid" | null>(null);
  const [rect, setRect] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [selMode, setSelMode] = useState<SelMode>("replace");
  const [strays, setStrays] = useState<Map<string, StrayReason>>(new Map());
  // The picture with text, letters and markers painted out (see cleanPlanImage). null until it is ready.
  const [cleanUrl, setCleanUrl] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [secName, setSecName] = useState("");
  const [secColor, setSecColor] = useState<string>(sectionPalette[1]!);
  const [secPrice, setSecPrice] = useState(30000);

  const svgRef = useRef<SVGSVGElement>(null);
  const canvasBox = useRef<HTMLDivElement>(null);
  const fitted = useRef(false);
  // The drag lives in a ref (not state) so a fast press-move-release is handled even before React re-renders.
  const drag = useRef<{ x: number; y: number; ex: number; ey: number; mode: SelMode } | null>(null);
  const replaceInput = useRef<HTMLInputElement>(null);

  // Open the plan fitted to the canvas so the whole venue is visible; the zoom buttons take over from there.
  useEffect(() => {
    const el = canvasBox.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (fitted.current || !entry || entry.contentRect.width === 0) return;
      fitted.current = true;
      const fit = (entry.contentRect.width - 28) / layout.width;
      setZoom(Math.min(1, Math.max(0.4, Math.floor(fit * 10) / 10)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [layout.width]);

  // Look for dots that don't look like the rest (letters, markers, extra marks) whenever the seats change.
  useEffect(() => {
    let alive = true;
    findStrayDots(layout.imageUrl, layout.seats)
      .then((found) => alive && setStrays(found))
      .catch(() => alive && setStrays(new Map()));
    return () => {
      alive = false;
    };
  }, [layout.imageUrl, layout.seats]);

  const snapshot = (): Snapshot => ({ layout, sections });
  const commit = (next: Partial<Snapshot>) => {
    setHistory((h) => ({ past: [...h.past, snapshot()].slice(-40), future: [] }));
    patch({ seatMap: { ...map, layout: next.layout ?? layout, sections: next.sections ?? sections } });
  };
  const restore = (s: Snapshot) => patch({ seatMap: { ...map, layout: s.layout, sections: s.sections } });
  const undo = () => {
    const prev = history.past.at(-1);
    if (!prev) return;
    setHistory((h) => ({ past: h.past.slice(0, -1), future: [...h.future, snapshot()] }));
    restore(prev);
    setSelected(new Set());
  };
  const redo = () => {
    const next = history.future.at(-1);
    if (!next) return;
    setHistory((h) => ({ past: [...h.past, snapshot()], future: h.future.slice(0, -1) }));
    restore(next);
  };

  const setSeats = (seats: LayoutSeat[]) => commit({ layout: { ...layout, seats: renumber(seats, layout.settings) } });

  const sectionById = useMemo(() => new Map(sections.map((s) => [s.id, s])), [sections]);
  const rows = useMemo(() => new Set(layout.seats.map((s) => s.row)).size, [layout.seats]);
  const unassigned = unassignedSeats(map);
  const blocked = layout.seats.filter((s) => s.blocked).length;
  const sellable = sections.reduce((n, s) => n + seatMapSectionStats(map, s).free, 0);
  const revenue = sections.reduce((n, s) => n + seatMapSectionStats(map, s).revenue, 0);
  const medianR = useMemo(() => {
    const rs = layout.seats.map((s) => s.r).sort((a, b) => a - b);
    return rs.length ? rs[rs.length >> 1]! : 9;
  }, [layout.seats]);

  // Build the cleaned picture once per image and detection settings (not on every seat edit).
  useEffect(() => {
    let alive = true;
    cleanPlanImage(layout.imageUrl, layout.settings, medianR * 2)
      .then((url) => alive && setCleanUrl(url))
      .catch(() => alive && setCleanUrl(null));
    return () => {
      alive = false;
    };
  }, [layout.imageUrl, layout.settings, medianR]);

  /* ---- pointer helpers ---- */

  function toImage(e: { clientX: number; clientY: number }) {
    const box = svgRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - box.left) * layout.width) / box.width, y: ((e.clientY - box.top) * layout.height) / box.height };
  }

  /** Shift adds to the selection and Alt removes from it; otherwise the New / Add / Remove buttons decide. */
  const modeFor = (e: { shiftKey: boolean; altKey: boolean; metaKey: boolean; ctrlKey: boolean }): SelMode =>
    e.altKey ? "remove" : e.shiftKey || e.metaKey || e.ctrlKey ? "add" : selMode;

  function applySelection(uids: string[], mode: SelMode) {
    setSelected((cur) => {
      if (mode === "replace") return new Set(uids);
      const next = new Set(cur);
      for (const u of uids) {
        if (mode === "add") next.add(u);
        else next.delete(u);
      }
      return next;
    });
  }

  /** The dot under a point of the plan, if any. The Area tool uses it to turn a plain click into a toggle. */
  function seatAt(p: { x: number; y: number }) {
    let best: LayoutSeat | null = null;
    let bestD = Infinity;
    for (const seat of layout.seats) {
      const d = (seat.x - p.x) ** 2 + (seat.y - p.y) ** 2;
      if (d < bestD && d <= (seat.r * 1.4) ** 2) {
        best = seat;
        bestD = d;
      }
    }
    return best;
  }

  function onCanvasDown(e: React.PointerEvent<SVGSVGElement>) {
    const p = toImage(e);
    if (tool === "add") {
      const nearest = layout.seats.reduce<{ d: number; seat: LayoutSeat | null }>(
        (best, s) => {
          const d = (s.x - p.x) ** 2 + (s.y - p.y) ** 2;
          return d < best.d ? { d, seat: s } : best;
        },
        { d: Infinity, seat: null },
      );
      const seat: LayoutSeat = {
        uid: newSeatUid(),
        x: p.x,
        y: p.y,
        r: medianR,
        section: nearest.seat?.section ?? sections[0]?.id ?? null,
        row: "",
        num: 0,
      };
      setSeats([...layout.seats, seat]);
      // The new dot joins the current selection, so a group can be completed and then named in one go.
      setSelected((cur) => new Set([...cur, seat.uid]));
      return;
    }
    if (tool === "area") {
      svgRef.current!.setPointerCapture(e.pointerId);
      drag.current = { x: p.x, y: p.y, ex: p.x, ey: p.y, mode: modeFor(e) };
      setRect({ x1: p.x, y1: p.y, x2: p.x, y2: p.y });
      return;
    }
    // select tool on empty space clears the selection (unless the click is meant to add or remove)
    if (modeFor(e) === "replace") setSelected(new Set());
  }

  function onCanvasMove(e: React.PointerEvent<SVGSVGElement>) {
    const d = drag.current;
    if (!d) return;
    const p = toImage(e);
    d.ex = p.x;
    d.ey = p.y;
    setRect({ x1: d.x, y1: d.y, x2: p.x, y2: p.y });
  }

  function onCanvasUp(e: React.PointerEvent<SVGSVGElement>) {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    setRect(null);
    const end = toImage(e);

    // A press and release without moving is a click: toggle the dot under the pointer.
    if (Math.hypot(end.x - d.x, end.y - d.y) * zoom < 4) {
      const hit = seatAt(end);
      if (hit) applySelection([hit.uid], d.mode === "replace" ? (selected.has(hit.uid) ? "remove" : "add") : d.mode);
      else if (d.mode === "replace") setSelected(new Set());
      return;
    }

    const [x1, x2] = [Math.min(d.x, end.x), Math.max(d.x, end.x)];
    const [y1, y2] = [Math.min(d.y, end.y), Math.max(d.y, end.y)];
    const hit = layout.seats.filter((s) => s.x >= x1 && s.x <= x2 && s.y >= y1 && s.y <= y2).map((s) => s.uid);
    applySelection(hit, d.mode);
  }

  function onSeatDown(e: React.PointerEvent, uid: string) {
    if (tool !== "select") return;
    e.stopPropagation();
    const mode = modeFor(e);
    if (mode === "replace") setSelected(new Set([uid]));
    // Shift-click keeps working as a toggle, as before.
    else if (mode === "add" && selected.has(uid) && (e.shiftKey || e.metaKey || e.ctrlKey)) applySelection([uid], "remove");
    else applySelection([uid], mode);
  }

  function selectRow(row: string) {
    setSelected(new Set(layout.seats.filter((s) => s.row === row).map((s) => s.uid)));
  }

  /* ---- actions on the selection ---- */

  const change = (fn: (s: LayoutSeat) => LayoutSeat) =>
    commit({ layout: { ...layout, seats: layout.seats.map((s) => (selected.has(s.uid) ? fn(s) : s)) } });

  const picked = layout.seats.filter((s) => selected.has(s.uid));
  const allBlocked = picked.length > 0 && picked.every((s) => s.blocked);
  const allAccessible = picked.length > 0 && picked.every((s) => s.accessible);

  function deleteSelected() {
    if (!picked.length) return;
    setSeats(layout.seats.filter((s) => !selected.has(s.uid)));
    setSelected(new Set());
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if ((e.key === "Delete" || e.key === "Backspace") && picked.length && (e.target as HTMLElement).tagName !== "INPUT") {
      e.preventDefault();
      deleteSelected();
    }
    if (e.key === "Escape") setSelected(new Set());
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a" && (e.target as HTMLElement).tagName !== "INPUT") {
      e.preventDefault();
      setSelected(new Set(layout.seats.map((s) => s.uid)));
    }
  }

  /* ---- sections ---- */

  const updateSection = (id: string, p: Partial<SeatSection>) =>
    commit({ sections: sections.map((s) => (s.id === id ? { ...s, ...p } : s)) });

  function addSection() {
    const id = `sec-${Date.now().toString(36)}`;
    const color = sectionPalette[sections.length % sectionPalette.length]!;
    commit({
      sections: [
        ...sections,
        { id, name: `Section ${sections.length + 1}`, color, price: 30000, rows: "—", seatsPerRow: 0, aisleAfter: 0, numbering: "1 → 16", seatType: "Single" },
      ],
    });
  }

  function removeSection(id: string) {
    if (sections.length < 2) return;
    const fallback = sections.find((s) => s.id !== id)!.id;
    commit({
      sections: sections.filter((s) => s.id !== id),
      layout: { ...layout, seats: layout.seats.map((s) => (s.section === id ? { ...s, section: fallback } : s)) },
    });
  }

  const assignSelected = (id: string) => change((s) => ({ ...s, section: id }));

  // Seats can be removed (undo, re-detect) after the check ran, so only count dots that still exist.
  const strayList = layout.seats.filter((s) => strays.has(s.uid));
  const strayReasons = [...new Set(strayList.map((s) => strayReasonLabel[strays.get(s.uid)!]))];
  const showStrays = () => {
    setTool("select");
    setSelected(new Set(strayList.map((s) => s.uid)));
  };
  function removeStrays() {
    if (!strayList.length) return;
    const gone = new Set(strayList.map((s) => s.uid));
    setSeats(layout.seats.filter((s) => !gone.has(s.uid)));
    setSelected(new Set());
  }

  /** Turns the selected seats into a new, named, coloured and priced section in one step. */
  function createSectionFromSelection() {
    const name = secName.trim();
    if (!name || !selected.size) return;
    const id = `sec-${Date.now().toString(36)}`;
    commit({
      sections: [
        ...sections,
        { id, name, color: secColor, price: secPrice, rows: "—", seatsPerRow: 0, aisleAfter: 0, numbering: "1 → 16", seatType: "Single" },
      ],
      layout: { ...layout, seats: layout.seats.map((s) => (selected.has(s.uid) ? { ...s, section: id } : s)) },
    });
    setNote(`Created "${name}" with ${selected.size} seat${selected.size === 1 ? "" : "s"}.`);
    setSelected(new Set());
    setSecName("");
    // Offer the next colour so consecutive sections are easy to tell apart.
    const used = new Set([...sections.map((x) => x.color), secColor]);
    setSecColor(sectionPalette.find((c) => !used.has(c)) ?? sectionPalette[0]!);
  }

  const emptySections = sections.filter((sec) => !layout.seats.some((seat) => seat.section === sec.id));
  const canRemoveEmpty = emptySections.length > 0 && emptySections.length < sections.length;
  const removeEmptySections = () => commit({ sections: sections.filter((sec) => !emptySections.includes(sec)) });

  /* ---- detection ---- */

  async function runDetection(next: DetectionSettings, imageUrl = layout.imageUrl, width = layout.width, height = layout.height) {
    setBusy(true);
    setNote(undefined);
    try {
      const first = sections[0]!.id;
      const { seats, detection } = await detectLayoutSeats(imageUrl, next, first);
      commit({ layout: { imageUrl, width, height, seats, settings: next }, sections });
      setSettings(next);
      setDetectStale(false);
      setSelected(new Set());
      setNote(
        seats.length
          ? `Found ${seats.length} seats in ${new Set(seats.map((s) => s.row)).size} rows${detection.polarity === "dark" ? " (dark seats)" : " (light seats)"}.`
          : "No seats found with these settings. Try a lower sensitivity or widen the seat size range.",
      );
    } catch {
      setNote("Detection failed on this picture.");
    } finally {
      setBusy(false);
    }
  }

  function updateNumbering(p: Partial<DetectionSettings>) {
    const next = { ...settings, ...p };
    setSettings(next);
    // Row and seat order only change labels, so apply it straight away without detecting again.
    commit({ layout: { ...layout, settings: next, seats: renumber(layout.seats, next) } });
  }

  function updateDetection(p: Partial<DetectionSettings>) {
    setSettings((s) => ({ ...s, ...p }));
    setDetectStale(true);
  }

  async function replaceImage(file?: File) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > MAX_BYTES) {
      setNote("Use a PNG, JPG or WebP picture under 12 MB.");
      return;
    }
    try {
      const plan = await readPlanFile(file);
      await runDetection(settings, plan.imageUrl, plan.width, plan.height);
    } catch {
      setNote("That picture couldn't be read.");
    }
  }

  function backToGrid() {
    const sectionsGrid = seatSectionTemplates["Theatre with balcony"]!;
    patch({
      seatMap: {
        template: "Theatre with balcony",
        sections: sectionsGrid,
        blocked: ["H8", "H9"],
        accessible: ["A1", "A16"],
      },
    });
    setConfirm(null);
  }

  // The selection can hold ids of seats that were since removed (undo, re-detect), so count only live ones.
  const selectedCount = layout.seats.reduce((n, s) => n + (selected.has(s.uid) ? 1 : 0), 0);
  const hasEdits = layout.seats.some((s) => s.blocked || s.accessible) || sections.length > 1;

  return (
    <div className="space-y-5" onKeyDown={onKeyDown}>
      <Panel className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold">
            <ScanSearch size={18} aria-hidden />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-bold text-text">Seating plan from your image</p>
            <p className="mt-1 text-[11px] text-dim" aria-live="polite">
              {layout.seats.length} seats · {rows} rows · {sections.length} section{sections.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="border-line text-text hover:bg-surface-2" onClick={() => replaceInput.current?.click()}>
            <ImagePlus size={14} aria-hidden /> Replace image
          </Button>
          <input
            ref={replaceInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            aria-label="Upload a different seating plan"
            onChange={(e) => {
              void replaceImage(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <Button variant="ghost" size="sm" onClick={() => setConfirm("grid")}>
            Use the row and column builder instead
          </Button>
        </div>
      </Panel>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1fr_21.5rem]">
        {/* ---- canvas ---- */}
        <Panel className="min-w-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-3">
            <div className="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="Seating plan tools">
              <Tool label="Select seats" active={tool === "select"} onClick={() => setTool("select")}>
                <MousePointer2 size={16} />
              </Tool>
              <Tool label="Select an area" active={tool === "area"} onClick={() => setTool("area")}>
                <SquareDashedMousePointer size={16} />
              </Tool>
              <Tool label="Add a seat" active={tool === "add"} onClick={() => setTool("add")}>
                <Plus size={16} />
              </Tool>
              {tool !== "add" && (
                <div role="group" aria-label="What selecting does" className="ml-1 inline-flex gap-0.5 rounded-lg border border-line p-0.5">
                  {(
                    [
                      ["replace", "New"],
                      ["add", "Add"],
                      ["remove", "Remove"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={selMode === value}
                      title={
                        value === "replace"
                          ? "Start a new selection"
                          : value === "add"
                            ? "Add dots to the selection (or hold Shift)"
                            : "Take dots out of the selection (or hold Alt)"
                      }
                      onClick={() => setSelMode(value)}
                      className={`flex h-8 items-center gap-1 rounded-md px-2.5 text-xs font-bold transition-colors focus-visible:focus-ring ${
                        selMode === value
                          ? value === "remove"
                            ? "bg-danger/20 text-danger"
                            : "bg-gold/15 text-gold"
                          : "text-muted hover:text-text"
                      }`}
                    >
                      {value === "add" && <Plus size={12} aria-hidden />}
                      {value === "remove" && <Minus size={12} aria-hidden />}
                      {label}
                    </button>
                  ))}
                </div>
              )}
              <span aria-hidden className="mx-1 h-6 w-px bg-line" />
              <Tool label="Undo" disabled={history.past.length === 0} onClick={undo}>
                <Undo2 size={16} />
              </Tool>
              <Tool label="Redo" disabled={history.future.length === 0} onClick={redo}>
                <Redo2 size={16} />
              </Tool>
            </div>
            <div className="flex items-center gap-1.5">
              <Tool label={showImage ? "Hide the plan image" : "Show the plan image"} active={showImage} onClick={() => setShowImage((v) => !v)}>
                {showImage ? <Eye size={16} /> : <EyeOff size={16} />}
              </Tool>
              <Tool
                label={showOriginal ? "Hide text and markers from the picture" : "Show text and markers from the picture"}
                active={showOriginal}
                disabled={!showImage}
                onClick={() => setShowOriginal((v) => !v)}
              >
                <Layers size={16} />
              </Tool>
              <Tool label="Show seat labels" active={showLabels} onClick={() => setShowLabels((v) => !v)}>
                <Hash size={16} />
              </Tool>
              <span aria-hidden className="mx-1 h-6 w-px bg-line" />
              <Tool label="Zoom out" onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.2).toFixed(1)))}>
                <ZoomOut size={16} />
              </Tool>
              <span className="w-11 text-center text-xs font-bold text-text">{Math.round(zoom * 100)}%</span>
              <Tool label="Zoom in" onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(1)))}>
                <ZoomIn size={16} />
              </Tool>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line bg-surface-2 px-4 py-2 text-[11px] text-dim">
            <p>
              {tool === "select" &&
                "Click a dot to select it. Use Add or Remove (or Shift / Alt) to fix the group dot by dot. Click a row letter to select a whole row."}
              {tool === "area" &&
                "Drag a box around dots to select them, then use Add or Remove to correct it. A single click toggles one dot. Shift adds, Alt removes."}
              {tool === "add" &&
                "Click the plan to place a dot the detector missed. New dots join your selection so you can put them in a section."}
            </p>
            {selectedCount > 0 && (
              <p className="flex items-center gap-2 font-bold text-gold" aria-live="polite">
                {selectedCount} selected
                <button type="button" onClick={() => setSelected(new Set())} className="font-normal text-muted underline hover:text-text">
                  Clear
                </button>
              </p>
            )}
          </div>

          <div ref={canvasBox} className="max-h-[70vh] overflow-auto bg-black/40 p-3 sm:p-4" tabIndex={0} aria-label="Seating plan canvas">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${layout.width} ${layout.height}`}
              style={{ width: layout.width * zoom, maxWidth: "none" }}
              className={`block select-none touch-none ${tool === "select" ? "cursor-default" : "cursor-crosshair"}`}
              onPointerDown={onCanvasDown}
              onPointerMove={onCanvasMove}
              onPointerUp={onCanvasUp}
              role="application"
              aria-label="Seating plan. Use the tools above to select and edit seats."
            >
              <rect width={layout.width} height={layout.height} fill="#0b0907" />
              {/* Greyscale on purpose: the only colours on the chart should be the sections' colours. */}
              {showImage && (
                <image
                  href={showOriginal || !cleanUrl ? layout.imageUrl : cleanUrl}
                  width={layout.width}
                  height={layout.height}
                  opacity={0.4}
                  style={{ filter: "grayscale(1)" }}
                />
              )}

              {layout.seats.map((s) => {
                const sec = s.section ? sectionById.get(s.section) : undefined;
                const isSel = selected.has(s.uid);
                return (
                  <g
                    key={s.uid}
                    onPointerDown={(e) => onSeatDown(e, s.uid)}
                    className={tool === "select" ? "cursor-pointer" : undefined}
                  >
                    <title>{`${s.row}${s.num}${sec ? ` · ${sec.name}` : " · not assigned"}${s.blocked ? " · blocked" : ""}${s.accessible ? " · accessible" : ""}${strays.has(s.uid) ? ` · may not be a seat: ${strayReasonLabel[strays.get(s.uid)!]}` : ""}`}</title>
                    <circle
                      cx={s.x}
                      cy={s.y}
                      r={s.r * 0.95}
                      fill={s.blocked ? "#0b0907" : sec ? sec.color : "transparent"}
                      fillOpacity={s.blocked ? 0.85 : 0.85}
                      stroke={s.blocked ? "#7a756c" : sec ? "#0b0907" : "#e5484d"}
                      strokeWidth={s.blocked || !sec ? 1.6 : 1}
                      strokeDasharray={s.blocked || !sec ? "3 2" : undefined}
                    />
                    {s.accessible && !s.blocked && (
                      <circle cx={s.x} cy={s.y} r={s.r * 0.45} fill="#0b0907" fillOpacity={0.75} />
                    )}
                    {s.blocked && (
                      <path
                        d={`M${s.x - s.r * 0.5} ${s.y - s.r * 0.5} L${s.x + s.r * 0.5} ${s.y + s.r * 0.5} M${s.x + s.r * 0.5} ${s.y - s.r * 0.5} L${s.x - s.r * 0.5} ${s.y + s.r * 0.5}`}
                        stroke="#7a756c"
                        strokeWidth={1.4}
                      />
                    )}
                    {strays.has(s.uid) && (
                      <circle cx={s.x} cy={s.y} r={s.r * 1.55} fill="none" stroke="#fb923c" strokeWidth={1.6} strokeDasharray="3 2" />
                    )}
                    {isSel && <circle cx={s.x} cy={s.y} r={s.r * 1.3} fill="none" stroke="#fff" strokeWidth={2} />}
                    {showLabels && (
                      <text x={s.x} y={s.y + s.r * 0.32} fontSize={Math.max(6, s.r * 0.85)} textAnchor="middle" fill="#0b0907" fontWeight={700} pointerEvents="none">
                        {s.num}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Row letters, drawn at the left end of each row so a whole row can be selected */}
              {showLabels &&
                Object.entries(
                  layout.seats.reduce<Record<string, LayoutSeat[]>>((acc, s) => ((acc[s.row] ??= []).push(s), acc), {}),
                ).map(([row, list]) => {
                  const first = list.reduce((a, b) => (b.x < a.x ? b : a));
                  return (
                    <text
                      key={row}
                      x={Math.max(10, first.x - first.r * 2.6)}
                      y={first.y + 4}
                      fontSize={Math.max(9, first.r)}
                      fill="#f7cb60"
                      fontWeight={700}
                      textAnchor="middle"
                      className="cursor-pointer"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        selectRow(row);
                      }}
                    >
                      {row}
                    </text>
                  );
                })}

              {rect && (
                <rect
                  x={Math.min(rect.x1, rect.x2)}
                  y={Math.min(rect.y1, rect.y2)}
                  width={Math.abs(rect.x2 - rect.x1)}
                  height={Math.abs(rect.y2 - rect.y1)}
                  fill="#f7cb60"
                  fillOpacity={0.12}
                  stroke="#f7cb60"
                  strokeDasharray="5 4"
                />
              )}
            </svg>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line px-4 py-3 text-[11px] text-dim">
            {sections.map((s) => (
              <span key={s.id} className="flex items-center gap-2">
                <span aria-hidden className="size-3 rounded-full" style={{ backgroundColor: s.color }} /> {s.name}
              </span>
            ))}
            <span className="flex items-center gap-2">
              <span aria-hidden className="size-3 rounded-full border border-dashed border-danger" /> Not assigned
            </span>
            <span className="flex items-center gap-2">
              <span aria-hidden className="size-3 rounded-full border border-dashed border-dim" /> Blocked
            </span>
          </div>
        </Panel>

        {/* ---- side panels ---- */}
        <div className="min-w-0 space-y-5">
          {strayList.length > 0 && (
            <Panel className="border-amber/50 p-5">
              <h2 className="flex items-center gap-2 text-base font-bold text-text">
                <TriangleAlert size={16} aria-hidden className="text-amber" /> Dots that may not be seats
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                <strong className="text-text">{strayList.length}</strong> dot{strayList.length === 1 ? "" : "s"} (ringed in orange on the
                plan) look different from the rest: {strayReasons.join(", ")}. They are often row letters, markers or text from your
                picture.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Action onClick={showStrays}>Show them</Action>
                <Action onClick={removeStrays} danger>
                  <Trash2 size={14} aria-hidden /> Remove {strayList.length}
                </Action>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-dim">
                Real seats in a different colour (for example a VIP row) can be flagged too. Use Show them to check before removing.
              </p>
            </Panel>
          )}

          <Panel className="p-5">
            <h2 className="text-base font-bold text-text">Selection</h2>
            <p className="mt-1 text-[11px] text-dim" aria-live="polite">
              {selectedCount === 0 ? "No seats selected" : `${selectedCount} seat${selectedCount === 1 ? "" : "s"} selected`}
            </p>

            {selectedCount === 0 ? (
              <p className="mt-4 rounded-lg border border-dashed border-line p-4 text-xs leading-relaxed text-muted">
                Drag a box around seats on the plan (Area tool), or click dots. Then name, colour and price them as a section here.
              </p>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Action disabled={!selectedCount} onClick={() => change((s) => ({ ...s, blocked: !allBlocked }))}>
                    <Ban size={14} aria-hidden /> {allBlocked ? "Unblock" : "Block"}
                  </Action>
                  <Action disabled={!selectedCount} onClick={() => change((s) => ({ ...s, accessible: !allAccessible }))}>
                    <Accessibility size={14} aria-hidden /> {allAccessible ? "Not accessible" : "Accessible"}
                  </Action>
                  <Action disabled={!selectedCount} onClick={deleteSelected} danger>
                    <Trash2 size={14} aria-hidden /> Delete dots
                  </Action>
                  <Action disabled={!selectedCount} onClick={() => setSelected(new Set())}>
                    Clear
                  </Action>
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-dim">
                  Wrong dots (text, a stage edge)? Switch to <strong className="text-muted">Remove</strong> and click them, or{" "}
                  <strong className="text-muted">Delete dots</strong> to take them off the chart. Missing a dot? Use the{" "}
                  <strong className="text-muted">+</strong> tool.
                </p>

                <form
                  className="mt-5 space-y-4 border-t border-line pt-5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    createSectionFromSelection();
                  }}
                >
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-dim">
                    Make these {selectedCount} seat{selectedCount === 1 ? "" : "s"} a section
                  </h3>

                  <div>
                    <label htmlFor="new-section-name" className="mb-1.5 block text-xs font-bold text-muted">
                      Section name
                    </label>
                    <input
                      id="new-section-name"
                      value={secName}
                      onChange={(e) => setSecName(e.target.value)}
                      placeholder="Front row"
                      className="h-10 w-full rounded-lg border border-line bg-surface-2 px-3 text-[13px] text-text placeholder:text-dim focus:border-gold focus:outline-none"
                    />
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {SECTION_NAMES.map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setSecName(n)}
                          className={`h-7 rounded-full border px-2.5 text-[11px] font-bold transition-colors focus-visible:focus-ring ${
                            secName === n ? "border-gold bg-gold/15 text-gold" : "border-line text-muted hover:border-gold/50 hover:text-text"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="mb-1.5 block text-xs font-bold text-muted">Colour</span>
                    <ColorSwatches value={secColor} onChange={setSecColor} label="New section colour" />
                  </div>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold text-muted">Price per seat</span>
                    <span className="flex h-10 items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 text-xs text-muted focus-within:border-gold">
                      ₩
                      <input
                        inputMode="numeric"
                        value={secPrice}
                        onChange={(e) => setSecPrice(Number(e.target.value.replace(/\D/g, "")) || 0)}
                        className="w-full bg-transparent text-[13px] font-bold text-text focus:outline-none"
                      />
                    </span>
                  </label>

                  <Button type="submit" className="w-full" disabled={!secName.trim()}>
                    Create section
                  </Button>
                  <p className="text-[11px] leading-relaxed text-dim">
                    Or put them in a section you already made with <strong className="text-muted">Put selected seats here</strong> below.
                  </p>
                </form>
              </>
            )}
          </Panel>

          <Panel className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-text">Sections and prices</h2>
              <Button variant="outline" size="sm" onClick={addSection}>
                <Plus size={14} aria-hidden /> Add
              </Button>
            </div>
            {canRemoveEmpty && (
              <p className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2 text-[11px] text-muted">
                {emptySections.length} section{emptySections.length === 1 ? " has" : "s have"} no seats.
                <button type="button" onClick={removeEmptySections} className="font-bold text-amber hover:text-gold">
                  Remove empty
                </button>
              </p>
            )}
            <ul className="mt-4 space-y-3">
              {sections.map((s) => {
                const st = seatMapSectionStats(map, s);
                return (
                  <li key={s.id} className="rounded-xl border border-line bg-surface-2 p-3">
                    <div className="flex items-center gap-2">
                      <span aria-hidden className="size-6 shrink-0 rounded-full border border-black/40" style={{ backgroundColor: s.color }} />
                      <input
                        aria-label="Section name"
                        value={s.name}
                        onChange={(e) => updateSection(s.id, { name: e.target.value })}
                        className="h-9 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 text-[13px] font-bold text-text hover:border-line focus:border-gold focus:outline-none"
                      />
                      <button
                        type="button"
                        aria-label={`Delete ${s.name}`}
                        disabled={sections.length < 2}
                        onClick={() => removeSection(s.id)}
                        className="rounded-md p-1.5 text-muted hover:text-danger disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="mt-2.5">
                      <ColorSwatches value={s.color} onChange={(c) => updateSection(s.id, { color: c })} label={`Colour of ${s.name}`} />
                    </div>
                    <div className="mt-2.5 flex items-center gap-2">
                      <label className="flex h-9 flex-1 items-center gap-2 rounded-md border border-line bg-surface px-2.5 text-xs text-muted focus-within:border-gold">
                        <span className="sr-only">Price</span>₩
                        <input
                          inputMode="numeric"
                          value={s.price}
                          onChange={(e) => updateSection(s.id, { price: Number(e.target.value.replace(/\D/g, "")) || 0 })}
                          className="w-full bg-transparent text-[13px] font-bold text-text focus:outline-none"
                        />
                      </label>
                      <span className="shrink-0 text-[11px] text-dim">
                        {st.free} seat{st.free === 1 ? "" : "s"}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={!selectedCount}
                      onClick={() => assignSelected(s.id)}
                      className="mt-2 h-9 w-full rounded-md border border-line text-xs font-bold text-text transition-colors hover:border-gold/50 hover:text-gold disabled:cursor-not-allowed disabled:opacity-40 focus-visible:focus-ring"
                    >
                      Put selected seats here
                    </button>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel className="p-5">
            <h2 className="text-base font-bold text-text">Detection</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-dim">If seats were missed or text was picked up, adjust these and detect again.</p>

            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-muted">Seats are</span>
                <Select
                  value={settings.polarity}
                  onChange={(e) => updateDetection({ polarity: e.target.value as DetectionSettings["polarity"] })}
                  className="h-10 w-full rounded-lg border border-line bg-surface-2 px-3 text-[13px] text-text focus:border-gold focus:outline-none"
                >
                  <option value="auto">Found automatically</option>
                  <option value="dark">Darker than the background</option>
                  <option value="light">Lighter than the background</option>
                </Select>
              </label>
              <Slider
                label="Sensitivity"
                hint="Lower finds fainter seats"
                min={-60}
                max={60}
                step={5}
                value={settings.threshold}
                onChange={(v) => updateDetection({ threshold: v })}
              />
              <Slider
                label="Smallest seat"
                hint={`${Math.round(settings.sizeRange[0] * 100)}% of a typical seat`}
                min={0.3}
                max={1}
                step={0.05}
                value={settings.sizeRange[0]}
                onChange={(v) => updateDetection({ sizeRange: [v, settings.sizeRange[1]] })}
              />
              <Slider
                label="Largest seat"
                hint={`${Math.round(settings.sizeRange[1] * 100)}% of a typical seat`}
                min={1}
                max={3}
                step={0.1}
                value={settings.sizeRange[1]}
                onChange={(v) => updateDetection({ sizeRange: [settings.sizeRange[0], v] })}
              />
              <Button
                className="w-full"
                disabled={busy}
                onClick={() => (hasEdits || layout.seats.length > 0 ? setConfirm("redetect") : void runDetection(settings))}
              >
                {busy ? <Loader2 size={15} aria-hidden className="animate-spin" /> : <ScanSearch size={15} aria-hidden />}
                {busy ? "Detecting…" : detectStale ? "Detect seats again" : "Detect again"}
              </Button>
              {note && (
                <p role="status" className="text-[11px] leading-relaxed text-muted">
                  {note}
                </p>
              )}
            </div>

            <div className="mt-5 space-y-4 border-t border-line pt-5">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-dim">Numbering</h3>
              <Slider
                label="Row grouping"
                hint="Raise if one row split in two, lower if two rows merged"
                min={0.2}
                max={1.5}
                step={0.1}
                value={settings.rowTolerance}
                onChange={(v) => updateNumbering({ rowTolerance: v })}
              />
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-muted">Row A is at the</span>
                  <Select
                    value={settings.rowOrder}
                    onChange={(e) => updateNumbering({ rowOrder: e.target.value as DetectionSettings["rowOrder"] })}
                    className="h-10 w-full rounded-lg border border-line bg-surface-2 px-2 text-[13px] text-text focus:border-gold focus:outline-none"
                  >
                    <option value="top-down">Top</option>
                    <option value="bottom-up">Bottom</option>
                  </Select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-muted">Seat 1 is on the</span>
                  <Select
                    value={settings.seatOrder}
                    onChange={(e) => updateNumbering({ seatOrder: e.target.value as DetectionSettings["seatOrder"] })}
                    className="h-10 w-full rounded-lg border border-line bg-surface-2 px-2 text-[13px] text-text focus:border-gold focus:outline-none"
                  >
                    <option value="left-right">Left</option>
                    <option value="right-left">Right</option>
                  </Select>
                </label>
              </div>
            </div>
          </Panel>

          <Panel className="p-5">
            <dl className="space-y-3 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-muted">Seats for sale</dt>
                <dd className="font-bold text-text">{sellable}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Blocked</dt>
                <dd className="text-text">{blocked}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Not assigned</dt>
                <dd className={unassigned > 0 ? "font-bold text-danger" : "text-text"}>{unassigned}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-line pt-3">
                <dt className="text-xs font-bold text-text">If every seat sells</dt>
                <dd className="text-base font-bold text-text">{formatKrw(revenue)}</dd>
              </div>
            </dl>
            {unassigned > 0 && (
              <p className="mt-3 text-[11px] leading-relaxed text-danger">
                Seats with a red dashed outline have no section. Select them and put them in a section before you publish.
              </p>
            )}
          </Panel>
        </div>
      </div>

      <Dialog open={confirm === "redetect"} onClose={() => setConfirm(null)} title="Detect seats again?">
        <p className="text-sm leading-relaxed text-muted">
          This replaces the seats you have now. Seats you added, blocked or marked accessible are reset, and every seat goes back into
          the first section. Your sections and prices stay.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirm(null)}>
            Keep my chart
          </Button>
          <Button
            onClick={() => {
              setConfirm(null);
              void runDetection(settings);
            }}
          >
            Detect again
          </Button>
        </div>
      </Dialog>

      <Dialog open={confirm === "grid"} onClose={() => setConfirm(null)} title="Switch to the row and column builder?">
        <p className="text-sm leading-relaxed text-muted">
          Your uploaded plan and the seats built from it will be removed from this event. You can upload it again later.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirm(null)}>
            Keep the plan
          </Button>
          <Button variant="danger" onClick={backToGrid}>
            Switch builder
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function Tool({
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

function Action({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex h-10 items-center justify-center gap-2 rounded-lg border text-xs font-bold transition-colors focus-visible:focus-ring disabled:cursor-not-allowed disabled:opacity-40 ${
        danger ? "border-danger/50 text-danger hover:bg-danger/10" : "border-line text-text hover:border-gold/50 hover:text-gold"
      }`}
    >
      {children}
    </button>
  );
}

function Slider({
  label,
  hint,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  const id = useId();
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-xs font-bold text-muted">
          {label}
        </label>
        <span className="truncate text-[11px] text-dim">{hint}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer accent-[#e8a83a]"
      />
    </div>
  );
}

/** The palette plus a free colour choice. Used for both the new-section form and each existing section. */
function ColorSwatches({ value, onChange, label }: { value: string; onChange: (color: string) => void; label: string }) {
  const custom = !sectionPalette.includes(value);
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      {sectionPalette.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`Use colour ${c}`}
          aria-pressed={value === c}
          onClick={() => onChange(c)}
          className={`size-6 rounded-full border-2 transition-transform hover:scale-110 focus-visible:focus-ring ${
            value === c ? "border-white" : "border-black/40"
          }`}
          style={{ backgroundColor: c }}
        />
      ))}
      <label
        className={`relative size-6 cursor-pointer overflow-hidden rounded-full border-2 ${custom ? "border-white" : "border-black/40"}`}
        style={{ background: "conic-gradient(#f7cb60, #e0281f, #c084fc, #60a5fa, #4ade80, #f7cb60)" }}
        title="Pick any colour"
      >
        <span className="sr-only">Pick any colour</span>
        <input
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#f7cb60"}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}
