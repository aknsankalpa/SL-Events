import { Check } from "lucide-react";

export const bookingSteps = ["Tickets", "Summary", "Payment", "Upload proof", "Confirmation"] as const;

/** `current` is 1-based. Steps before it show a tick. */
export function Stepper({ current }: { current: number }) {
  return (
    <ol aria-label="Booking progress" className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-3">
      {bookingSteps.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={label} className="flex items-center gap-2" aria-current={active ? "step" : undefined}>
            <span
              className={`flex size-[26px] items-center justify-center rounded-full border text-xs font-bold ${
                done
                  ? "border-transparent bg-gradient-to-b from-gold to-amber text-ink"
                  : active
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-line text-muted"
              }`}
            >
              {done ? <Check size={14} strokeWidth={3} aria-hidden /> : n}
            </span>
            <span className={`text-xs font-bold ${done || active ? "text-text" : "text-muted"}`}>{label}</span>
            {n < bookingSteps.length && (
              <span aria-hidden className={`mx-1 hidden h-px w-8 sm:block ${done ? "bg-amber" : "bg-line"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
