import type { ComponentProps, ReactNode } from "react";
import { CategoryArt, CategoryIcon, coverGradients, coverIconClass } from "@/components/events/CategoryIcon";
import type { CategoryId } from "@/lib/data";

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`rounded-xl border border-line bg-surface ${className}`} {...props} />;
}

export function CardTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 className="text-lg font-bold text-text">{children}</h2>
      {action}
    </div>
  );
}

/** Small square cover used in order summaries. */
export function EventThumb({ category, size = 56, plain = false }: { category: CategoryId; size?: number; plain?: boolean }) {
  return (
    <span
      style={{ width: size, height: size }}
      className={`flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${coverGradients[category]}`}
    >
      {plain ? (
        <CategoryIcon id={category} size={size * 0.42} strokeWidth={1.75} className={coverIconClass(category)} />
      ) : (
        <CategoryArt id={category} size={size * 0.74} />
      )}
    </span>
  );
}

export function Row({ label, value, strong }: { label: ReactNode; value: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-[13px]">
      <span className="text-muted">{label}</span>
      <span className={strong ? "font-bold text-text" : "text-text"}>{value}</span>
    </div>
  );
}
