"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

/**
 * Touch and mouse handling for a seat chart inside a scrolling frame, shared by the organizer's builder and the buyer's
 * picker so they feel the same. The rules keep gestures from mixing:
 *
 *   - ONE finger does exactly one job, decided when it lands: the tool's own job (move a seat, draw a box), or panning
 *     the chart. A press that barely moves is a tap.
 *   - TWO fingers always zoom and pan the chart, and nothing else. A second finger landing cancels whatever the first
 *     finger was doing without committing it.
 *   - After a pinch, the finger left on the screen is ignored until every finger is lifted, so ending a pinch never
 *     turns into an accidental drag or tap.
 *   - Every finger is captured by the frame, so lifting it outside the chart still ends the gesture. A new first finger
 *     also clears any finger the browser forgot to report, so the chart can never be left stuck.
 *
 * The frame must have `touch-action: none` so the browser leaves every gesture to this code.
 */

type Pt = { x: number; y: number };
type Mode = "idle" | "tool" | "pan" | "pinch" | "locked";

export type ChartGestureOptions = {
  /** The scrolling frame the chart lives in. It also receives the pointer events. */
  boxRef: React.RefObject<HTMLElement | null>;
  zoom: number;
  setZoom: (zoom: number) => void;
  minZoom?: number;
  maxZoom?: number;
  /** A finger or mouse button went down. "tool": the caller handles it. "pan": it moves the chart, a tap is reported. */
  onSingleDown: (e: React.PointerEvent) => "tool" | "pan";
  /** The "tool" finger moved (at most once per frame). */
  onSingleMove?: (e: React.PointerEvent) => void;
  /** The "tool" finger lifted normally. */
  onSingleUp?: (e: React.PointerEvent) => void;
  /** A "pan" finger lifted without having moved. */
  onTap?: (e: React.PointerEvent) => void;
  /** A "tool" gesture was interrupted (second finger, cancel): drop it without committing. */
  onAbort?: () => void;
};

/** How far a finger may wobble before a press counts as a drag. Fingers are less steady than a mouse. */
const SLOP_TOUCH = 9;
const SLOP_MOUSE = 4;

export function useChartGestures(options: ChartGestureOptions) {
  const { boxRef, zoom } = options;
  const minZoom = options.minZoom ?? 0.2;
  const maxZoom = options.maxZoom ?? 4;

  // The handlers below are created once, so they read the newest options from here.
  const latest = useRef(options);
  useLayoutEffect(() => {
    latest.current = options;
  });

  const pointers = useRef(new Map<number, Pt>());
  const mode = useRef<Mode>("idle");
  const start = useRef({ x: 0, y: 0, left: 0, top: 0, touch: true });
  const moved = useRef(false);
  const pinch = useRef<{ dist: number; zoom: number; cx: number; cy: number } | null>(null);
  /** Where the point under the fingers should end up in the frame once the new zoom has been laid out. */
  const anchor = useRef<{ cx: number; cy: number; mx: number; my: number } | null>(null);
  const frame = useRef(0);
  const pendingMove = useRef<React.PointerEvent | null>(null);
  const pendingPinch = useRef<{ zoom: number; mx: number; my: number } | null>(null);

  const clamp = useCallback((z: number) => Math.min(maxZoom, Math.max(minZoom, +z.toFixed(3))), [minZoom, maxZoom]);

  /** Puts the chart point `a.cx, a.cy` under frame position `a.mx, a.my`, whatever the chart's size and offset now are. */
  const place = useCallback(
    (a: { cx: number; cy: number; mx: number; my: number }, z: number) => {
      const el = boxRef.current;
      const svg = el?.querySelector("svg");
      if (!el || !svg) return;
      const r = svg.getBoundingClientRect();
      const f = el.getBoundingClientRect();
      // Where the chart starts inside the scrolling content, measured now so a centred chart is handled too.
      const left = r.left - f.left - el.clientLeft + el.scrollLeft;
      const top = r.top - f.top - el.clientTop + el.scrollTop;
      el.scrollLeft = left + a.cx * z - a.mx;
      el.scrollTop = top + a.cy * z - a.my;
    },
    [boxRef],
  );

  // After React has resized the chart for a new zoom, move the scroll so the spot between the fingers stays put.
  useLayoutEffect(() => {
    const a = anchor.current;
    if (!a) return;
    anchor.current = null;
    place(a, zoom);
  }, [zoom, place]);

  const flush = useCallback(() => {
    frame.current = 0;
    const o = latest.current;
    const move = pendingMove.current;
    pendingMove.current = null;
    if (move && mode.current === "tool") o.onSingleMove?.(move);

    const p = pendingPinch.current;
    pendingPinch.current = null;
    const pc = pinch.current;
    if (p && pc && mode.current === "pinch") {
      const a = { cx: pc.cx, cy: pc.cy, mx: p.mx, my: p.my };
      if (p.zoom !== o.zoom) {
        anchor.current = a;
        o.setZoom(p.zoom);
      } else {
        place(a, o.zoom);
      }
    }
  }, [place]);

  const schedule = useCallback(() => {
    if (!frame.current) frame.current = requestAnimationFrame(flush);
  }, [flush]);

  const stopFrame = useCallback(() => {
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = 0;
    pendingMove.current = null;
    pendingPinch.current = null;
  }, []);

  /** Everything is lifted: back to the start. */
  const reset = useCallback(() => {
    pointers.current.clear();
    mode.current = "idle";
    pinch.current = null;
    moved.current = false;
    stopFrame();
  }, [stopFrame]);

  const beginPinch = useCallback(() => {
    const el = boxRef.current;
    const svg = el?.querySelector("svg");
    const [a, b] = [...pointers.current.values()] as [Pt, Pt];
    if (!el || !svg || !a || !b) {
      mode.current = "locked";
      return;
    }
    const r = svg.getBoundingClientRect();
    const z = latest.current.zoom || 1;
    pinch.current = {
      dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      zoom: z,
      // The chart point between the fingers, in zoom-independent units.
      cx: ((a.x + b.x) / 2 - r.left) / z,
      cy: ((a.y + b.y) / 2 - r.top) / z,
    };
    mode.current = "pinch";
  }, [boxRef]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // A first finger means no other finger can be down. Forget any the browser never told us were lifted.
      if (e.isPrimary) reset();
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* the pointer is already gone */
      }
      const o = latest.current;

      if (pointers.current.size >= 2) {
        if (mode.current === "tool") o.onAbort?.();
        if (mode.current !== "pinch") beginPinch();
        return;
      }

      const el = boxRef.current;
      start.current = { x: e.clientX, y: e.clientY, left: el?.scrollLeft ?? 0, top: el?.scrollTop ?? 0, touch: e.pointerType !== "mouse" };
      moved.current = false;
      mode.current = o.onSingleDown(e);
    },
    [beginPinch, boxRef, reset],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const el = boxRef.current;

      if (mode.current === "pinch") {
        const pc = pinch.current;
        const pts = [...pointers.current.values()];
        if (!pc || !el || pts.length < 2) return;
        const [a, b] = pts as [Pt, Pt];
        const f = el.getBoundingClientRect();
        pendingPinch.current = {
          zoom: clamp((pc.zoom * (Math.hypot(a.x - b.x, a.y - b.y) || 1)) / pc.dist),
          mx: (a.x + b.x) / 2 - f.left - el.clientLeft,
          my: (a.y + b.y) / 2 - f.top - el.clientTop,
        };
        schedule();
        return;
      }

      if (mode.current === "pan" && el) {
        const dx = e.clientX - start.current.x;
        const dy = e.clientY - start.current.y;
        if (!moved.current && Math.hypot(dx, dy) < (start.current.touch ? SLOP_TOUCH : SLOP_MOUSE)) return;
        moved.current = true;
        el.scrollLeft = start.current.left - dx;
        el.scrollTop = start.current.top - dy;
        return;
      }

      if (mode.current === "tool") {
        pendingMove.current = e;
        schedule();
      }
      // "locked" and "idle": nothing to do.
    },
    [boxRef, clamp, schedule],
  );

  const finish = useCallback(
    (e: React.PointerEvent, cancelled: boolean) => {
      if (!pointers.current.delete(e.pointerId)) return;
      const o = latest.current;
      const m = mode.current;

      if (m === "pinch") {
        // One finger is still down: ignore it until it is lifted too.
        mode.current = "locked";
        pinch.current = null;
        stopFrame();
      } else if (m === "tool") {
        stopFrame();
        if (cancelled) o.onAbort?.();
        else o.onSingleUp?.(e);
        mode.current = "idle";
      } else if (m === "pan") {
        mode.current = "idle";
        if (!cancelled && !moved.current) o.onTap?.(e);
      }
      if (pointers.current.size === 0) {
        mode.current = "idle";
        pinch.current = null;
      }
    },
    [stopFrame],
  );

  const onPointerUp = useCallback((e: React.PointerEvent) => finish(e, false), [finish]);
  const onPointerCancel = useCallback((e: React.PointerEvent) => finish(e, true), [finish]);
  const onLostPointerCapture = useCallback((e: React.PointerEvent) => finish(e, true), [finish]);

  // Safety net: if the frame never hears a finger lift (the page lost focus, a system gesture took over), clear on the
  // window so the next touch starts clean.
  useEffect(() => {
    const clear = () => {
      if (mode.current === "tool") latest.current.onAbort?.();
      reset();
    };
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", clear);
    return () => {
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", clear);
      stopFrame();
    };
  }, [reset, stopFrame]);

  return {
    bind: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onLostPointerCapture },
    /** Style for the frame: the browser must not scroll, zoom or select anything itself. */
    frameStyle: { touchAction: "none", userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" } as React.CSSProperties,
  };
}
