"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { REFERENCE_DATE, type OrganizerEvent } from "@/lib/organizer";
import { upcomingOf } from "./UpcomingEvents";

const DOW = ["S", "M", "T", "W", "T", "F", "S"];

function monthOf(iso: string) {
  return { y: Number(iso.slice(0, 4)), m: Number(iso.slice(5, 7)) - 1 };
}

/** Month grid with event days marked. Dates are handled in UTC so the grid never shifts with the viewer's timezone. */
export function EventCalendar({ events }: { events: OrganizerEvent[] }) {
  const upcoming = upcomingOf(events);
  const first = upcoming[0]?.startsAt ?? REFERENCE_DATE;
  const [view, setView] = useState(() => monthOf(first));

  const byDay = useMemo(() => {
    const map = new Map<string, OrganizerEvent[]>();
    for (const e of events) {
      if (!e.startsAt) continue;
      const day = e.startsAt.slice(0, 10);
      map.set(day, [...(map.get(day) ?? []), e]);
    }
    return map;
  }, [events]);

  const monthStart = new Date(Date.UTC(view.y, view.m, 1));
  const daysInMonth = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const lead = monthStart.getUTCDay();
  const cells = Array.from({ length: Math.ceil((lead + daysInMonth) / 7) * 7 }, (_, i) => {
    const day = i - lead + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });

  const label = monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const shift = (delta: number) =>
    setView((v) => {
      const d = new Date(Date.UTC(v.y, v.m + delta, 1));
      return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
    });

  const iso = (day: number) => `${view.y}-${String(view.m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return (
    <section className="rounded-2xl border border-line bg-surface p-4 sm:p-5 lg:[@media(max-height:760px)]:py-3" aria-label="Event calendar">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-text">{label}</h2>
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

      {/*
        The seven columns are set inline so the week grid can never collapse into a single column, whatever the
        generated stylesheet contains. The grid is capped in width so a wide card doesn't stretch it into a sparse table.
      */}
      <div
        className="mx-auto mt-3 grid max-w-sm gap-y-0.5 text-center lg:[@media(max-height:760px)]:mt-2"
        style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
      >
        {DOW.map((d, i) => (
          <span key={i} aria-hidden className="pb-1.5 text-[10px] font-bold text-dim lg:[@media(max-height:760px)]:pb-0.5">
            {d}
          </span>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <span key={i} />;
          const date = iso(day);
          const hits = byDay.get(date);
          const today = date === REFERENCE_DATE;
          const base = "mx-auto flex size-8 items-center justify-center rounded-full text-xs lg:size-7 lg:[@media(max-height:760px)]:size-6";
          if (hits) {
            return (
              <Link
                key={i}
                href={`/organizer/events/${hits[0]!.id}/edit`}
                title={hits.map((h) => h.title).join(", ")}
                aria-label={`${day}: ${hits.map((h) => h.title).join(", ")}`}
                className={`${base} bg-gradient-to-b from-gold to-amber font-bold text-ink focus-visible:focus-ring`}
              >
                {day}
              </Link>
            );
          }
          return (
            <span
              key={i}
              aria-current={today ? "date" : undefined}
              className={`${base} ${today ? "border border-gold/70 font-bold text-gold" : "text-muted"}`}
            >
              {day}
            </span>
          );
        })}
      </div>

      <p className="mt-3 flex items-center gap-2 text-[11px] text-dim lg:hidden">
        <span aria-hidden className="size-2.5 rounded-full bg-gradient-to-b from-gold to-amber" /> Event day
        <span aria-hidden className="ml-3 size-2.5 rounded-full border border-gold/70" /> Today
      </p>
    </section>
  );
}
