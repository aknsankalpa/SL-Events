"use client";

import { useEffect, useRef, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

export type PopoverPlacement = {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
  /** Where to render. A modal <dialog> sits in the top layer, so a popover for a field inside it must live inside it. */
  container: HTMLElement;
};

const MARGIN = 8;
const GAP = 6;

/**
 * Works out where a popover goes next to its trigger: below by default, above when there isn't room, and always
 * inside the viewport. Called from the click/keyboard handler that opens the popover, so no layout effect is needed.
 * `height` is the panel's expected height (the real height is capped by `maxHeight` anyway).
 */
export function placePopover(
  anchor: HTMLElement,
  { height, minWidth = 0, width, align = "left" }: { height: number; minWidth?: number; width?: number; align?: "left" | "right" },
): PopoverPlacement {
  const r = anchor.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.min(width ?? Math.max(r.width, minWidth), vw - MARGIN * 2);
  const below = vh - r.bottom - GAP - MARGIN;
  const above = r.top - GAP - MARGIN;
  const up = below < Math.min(height, 260) && above > below;
  const maxHeight = Math.max(140, up ? above : below);
  const h = Math.min(height, maxHeight);
  const left = Math.min(Math.max(align === "right" ? r.right - w : r.left, MARGIN), vw - w - MARGIN);
  return {
    left,
    top: up ? r.top - GAP - h : r.bottom + GAP,
    width: w,
    maxHeight,
    container: (anchor.closest("dialog") as HTMLElement | null) ?? document.body,
  };
}

type PanelProps = {
  anchor: RefObject<HTMLElement | null>;
  placement: PopoverPlacement;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  role?: string;
  id?: string;
  label?: string;
  /** Called on keydown inside the panel (the trigger handles keys while it has focus). */
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
};

/** The floating panel shared by every dropdown: dark surface, hairline border, rounded like the rest of the UI. */
export function PopoverPanel({ anchor, placement, onClose, children, className = "", role, id, label, onKeyDown }: PanelProps) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panel.current?.contains(t) || anchor.current?.contains(t)) return;
      onClose();
    };
    // A fixed panel would be left behind by scrolling, so close it (like a native select) unless the panel itself scrolled.
    const onScroll = (e: Event) => {
      if (panel.current?.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onClose);
    };
  }, [anchor, onClose]);

  return createPortal(
    <div
      ref={panel}
      id={id}
      role={role}
      aria-label={label}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          // Stop the modal <dialog> underneath from also closing on this Escape.
          e.preventDefault();
          e.stopPropagation();
          onClose();
          anchor.current?.focus();
          return;
        }
        onKeyDown?.(e);
      }}
      style={{
        position: "fixed",
        left: placement.left,
        top: placement.top,
        width: placement.width,
        maxHeight: placement.maxHeight,
      }}
      className={`z-[200] overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-2xl shadow-black/60 ${className}`}
    >
      {children}
    </div>,
    placement.container,
  );
}
