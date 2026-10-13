import { formatKrw } from "@/lib/format";
import type { EventItem } from "@/lib/data";

/** The venue's seating chart as buyers see it: the plan image with every sellable seat coloured by its section. */
export function SeatPlanView({ plan }: { plan: NonNullable<EventItem["seatingPlan"]> }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="overflow-x-auto bg-black/40 p-3 sm:p-4">
        <svg
          viewBox={`0 0 ${plan.width} ${plan.height}`}
          className="mx-auto block h-auto w-full min-w-[20rem] max-w-3xl"
          role="img"
          aria-label={`Seating plan with ${plan.legend.reduce((n, l) => n + l.seats, 0)} seats in ${plan.legend.length} sections`}
        >
          <rect width={plan.width} height={plan.height} fill="#0b0907" />
          <image href={plan.imageUrl} width={plan.width} height={plan.height} opacity={0.45} />
          {plan.seats.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r * 0.95} fill={s.color} fillOpacity={0.9} stroke="#0b0907" strokeWidth={1} />
          ))}
        </svg>
      </div>
      <ul className="flex flex-wrap gap-x-6 gap-y-3 border-t border-line px-4 py-3">
        {plan.legend.map((l) => (
          <li key={l.name} className="flex items-center gap-2.5 text-xs">
            <span aria-hidden className="size-3 rounded-full" style={{ backgroundColor: l.color }} />
            <span className="font-bold text-text">{l.name}</span>
            <span className="text-dim">
              {formatKrw(l.price)} · {l.seats} seats
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
