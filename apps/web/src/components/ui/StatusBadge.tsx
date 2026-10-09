import { statusMeta, type BookingStatus } from "@/lib/bookings";

const tones = {
  success: "bg-success/15 text-success border-success/30",
  warning: "bg-amber/15 text-amber border-amber/30",
  neutral: "bg-white/5 text-muted border-line",
  danger: "bg-danger/15 text-danger border-danger/30",
};

type BadgeProps = {
  tone?: keyof typeof tones;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
};

export function Badge({ tone = "neutral", dot, children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${tones[tone]} ${className}`}
    >
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: BookingStatus; className?: string }) {
  const { label, tone } = statusMeta[status];
  return (
    <Badge tone={tone} dot={status === "confirmed" || status === "under_review" || status === "attended"} className={className}>
      {label}
    </Badge>
  );
}
