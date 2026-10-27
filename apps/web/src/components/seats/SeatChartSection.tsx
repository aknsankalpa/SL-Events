"use client";

import { useState } from "react";
import type { SeatChart } from "@/lib/seating";
import { SeatPicker } from "./SeatPicker";
import { useTakenSeats } from "./useTakenSeats";

const EMPTY: ReadonlySet<string> = new Set();

/**
 * The seat chart on an event page. Visitors can look at it (booking starts from the tickets card). In the organizer's
 * preview it can be tried out with nothing taken, so an organizer sees what buyers will see.
 */
export function SeatChartSection({ chart, slug, preview = false }: { chart: SeatChart; slug: string; preview?: boolean }) {
  const taken = useTakenSeats(slug);
  const [tried, setTried] = useState<string[]>([]);
  const toggle = (id: string) => setTried((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length < 10 ? [...cur, id] : cur));

  return (
    <div className="space-y-3">
      <SeatPicker
        chart={chart}
        taken={preview ? EMPTY : taken}
        selected={preview ? tried : []}
        onToggle={preview ? toggle : undefined}
        onSelectMany={preview ? (ids) => setTried(ids) : undefined}
      />
      {preview && <p className="text-xs text-dim">Preview only: this is how buyers pick seats. Nothing is booked.</p>}
    </div>
  );
}
