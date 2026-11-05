"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { fromPrice, type EventItem } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { ticketsLeftTotal } from "@/lib/organizers";
import { CategoryIcon, coverGradients, coverIconClass } from "@/components/events/CategoryIcon";

const AUTO_MS = 5000;
const SWIPE_PX = 70;

/** Where a card sits in the stack, from its distance to the front: 0 is the front card, the next two peek out behind it. */
function place(pos: number, count: number): React.CSSProperties {
  if (pos === 0) return { transform: "translate3d(0,0,0) scale(1)", opacity: 1, zIndex: 30 };
  if (pos === 1) return { transform: "translate3d(0,-38px,0) scale(0.94)", opacity: 0.85, zIndex: 20 };
  if (pos === 2) return { transform: "translate3d(0,-78px,0) scale(0.88)", opacity: 0.55, zIndex: 10 };
  // The card that just left flies off to the left; everything further back waits hidden behind the stack.
  if (pos === count - 1) return { transform: "translate3d(-115%,0,0) rotate(-9deg) scale(0.96)", opacity: 0, zIndex: 40 };
  return { transform: "translate3d(0,-78px,0) scale(0.88)", opacity: 0, zIndex: 0 };
}

/**
 * The latest events as a stack of cards, and nothing else. The front card can be swiped (or dragged, or pushed with the
 * arrow keys) away and the next one rises from behind it. It moves on by itself unless the pointer is over it or focus
 * is inside it, and it does not move by itself for people who asked their device for less motion.
 */
export function LatestEventsStack({ events }: { events: EventItem[] }) {
  const count = events.length;
  const [active, setActive] = useState(0);
  const [hold, setHold] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(true);
  const [dx, setDx] = useState(0);
  const drag = useRef<{ id: number; x: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  // The drag distance also lives in a ref: a quick swipe can end before React has re-rendered the state above.
  const dragDx = useRef(0);

  const go = (to: number) => setActive(((to % count) + count) % count);

  useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(q.matches);
    sync();
    q.addEventListener("change", sync);
    return () => q.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (hold || reduceMotion || count < 2) return;
    const id = setTimeout(() => setActive((a) => (a + 1) % count), AUTO_MS);
    // Restarted after every change, so a manual move always gets a full pause before the next automatic one.
    return () => clearTimeout(id);
  }, [active, hold, reduceMotion, count]);

  if (count === 0) return null;
  const current = events[active]!;

  function onDown(e: React.PointerEvent) {
    drag.current = { id: e.pointerId, x: e.clientX, moved: false };
    dragDx.current = 0;
    suppressClick.current = false;
  }
  function onMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const delta = e.clientX - d.x;
    if (!d.moved && Math.abs(delta) < 8) return;
    if (!d.moved) {
      d.moved = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* pointer already gone */
      }
    }
    dragDx.current = delta;
    setDx(delta);
  }
  function onUp(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (d.moved) {
      suppressClick.current = true; // the finger lifting must not also open the event
      if (dragDx.current <= -SWIPE_PX) go(active + 1);
      else if (dragDx.current >= SWIPE_PX) go(active - 1);
    }
    dragDx.current = 0;
    setDx(0);
  }
  function onCancel() {
    drag.current = null;
    dragDx.current = 0;
    setDx(0);
  }

  return (
    // Just the stack: no heading or buttons around it. It fills the right side of the home page's hero.
    <div role="region" aria-roledescription="carousel" aria-label="Latest events">
      {/* Only the front card can be reached with a keyboard or a screen reader. Left and right arrows change the card. */}
      <div
        className="relative mx-auto h-[29rem] w-full max-w-md select-none pt-8 lg:mr-0"
        onMouseEnter={() => setHold(true)}
        onMouseLeave={() => setHold(false)}
        onFocus={() => setHold(true)}
        onBlur={() => setHold(false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(active + 1);
          else if (e.key === "ArrowLeft") go(active - 1);
        }}
        aria-live="off"
      >
        {events.map((event, i) => {
          const pos = (i - active + count) % count;
          const front = pos === 0;
          const style = place(pos, count);
          const dragging = front && dx !== 0;
          return (
            <div
              key={event.slug}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              aria-hidden={!front}
              inert={!front}
              onPointerDown={front ? onDown : undefined}
              onPointerMove={front ? onMove : undefined}
              onPointerUp={front ? onUp : undefined}
              onPointerCancel={front ? onCancel : undefined}
              onClickCapture={
                front
                  ? (e) => {
                      if (suppressClick.current) {
                        e.preventDefault();
                        e.stopPropagation();
                        suppressClick.current = false;
                      }
                    }
                  : undefined
              }
              className={`absolute inset-x-0 bottom-0 top-8 origin-bottom ${
                dragging ? "" : "transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
              } ${front ? "cursor-grab active:cursor-grabbing" : "pointer-events-none"}`}
              style={{
                ...style,
                touchAction: "pan-y",
                ...(dragging ? { transform: `translate3d(${dx}px,0,0) rotate(${dx / 22}deg)`, opacity: Math.max(0.4, 1 - Math.abs(dx) / 500) } : {}),
              }}
            >
              <StackCard event={event} />
            </div>
          );
        })}
      </div>
      <p className="sr-only" aria-live="polite">
        Showing {current.title}
      </p>
    </div>
  );
}

function StackCard({ event }: { event: EventItem }) {
  const left = ticketsLeftTotal(event);
  return (
    <Link
      href={`/events/${event.slug}`}
      draggable={false}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gold/30 bg-surface shadow-[0_24px_60px_-20px_rgb(0_0_0/0.8)] focus-visible:focus-ring"
    >
      <div className={`relative flex flex-1 items-center justify-center bg-gradient-to-br ${coverGradients[event.category]}`}>
        <span className="absolute left-4 top-4 rounded-full border border-gold/40 bg-black/60 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-gold">
          {event.category}
        </span>
        {left === 0 ? (
          <span className="absolute right-4 top-4 rounded-full bg-black/70 px-3 py-1 text-[10px] font-bold text-muted">SOLD OUT</span>
        ) : (
          (event.fewLeft || left <= 20) && <span className="absolute right-4 top-4 rounded-full bg-danger px-3 py-1 text-[10px] font-bold text-white">FEW LEFT</span>
        )}
        <CategoryIcon id={event.category} size={72} strokeWidth={1.3} className={`${coverIconClass(event.category)} transition-transform duration-500 group-hover:scale-110`} />
        <span className="absolute bottom-4 left-4 rounded-lg bg-black/65 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-amber">{event.badgeDate}</span>
      </div>
      <div className="flex flex-col gap-2 p-5">
        <h3 className="line-clamp-2 text-xl font-bold leading-snug text-text">{event.title}</h3>
        <p className="flex items-center gap-2 text-[13px] text-muted">
          <MapPin size={14} aria-hidden className="shrink-0 text-dim" />
          <span className="truncate">
            {event.venue}, {event.city}
          </span>
        </p>
        <p className="flex items-center gap-2 text-[13px] text-muted">
          <CalendarDays size={14} aria-hidden className="shrink-0 text-dim" />
          {event.dateLabel}
        </p>
        <div className="mt-2 flex items-center justify-between border-t border-line pt-3">
          <span className="text-base font-bold text-text">
            {event.singlePrice || fromPrice(event) === 0 ? "" : "From "}
            {formatPrice(fromPrice(event))}
          </span>
          <span className="flex items-center gap-1.5 text-[13px] font-bold text-amber">
            View event <ArrowRight size={14} aria-hidden className="transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </Link>
  );
}
