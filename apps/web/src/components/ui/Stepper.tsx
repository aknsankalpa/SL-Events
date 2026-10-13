import { Check } from "lucide-react";

export const bookingSteps = ["Tickets", "Summary", "Payment", "Upload proof", "Confirmation"] as const;

type StepperProps = {
  /** 1-based index of the active step. Steps before it show a tick. */
  current: number;
  steps?: readonly string[];
  label?: string;
  className?: string;
};

export function Stepper({ current, steps = bookingSteps, label = "Booking progress", className = "mt-6" }: StepperProps) {
  return (
    <ol aria-label={label} className={`${className} flex flex-wrap items-center gap-x-2 gap-y-3`}>
      {steps.map((step, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={step} className="flex items-center gap-2" aria-current={active ? "step" : undefined}>
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
            <span className={`text-xs font-bold ${done || active ? "text-text" : "text-muted"}`}>{step}</span>
            {n < steps.length && (
              <span aria-hidden className={`mx-1 hidden h-px w-8 sm:block ${done ? "bg-amber" : "bg-line"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
