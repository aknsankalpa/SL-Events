"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, Clock, Copy, HelpCircle, Upload } from "lucide-react";
import { OrderSummary } from "@/components/booking/OrderSummary";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/StatusBadge";
import type { Booking } from "@/lib/bookings";
import { paymentAccount, type EventItem } from "@/lib/data";
import { formatKrw } from "@/lib/format";

function useCountdown(deadlineIso?: string) {
  // Start as null so server and first client render match; the clock starts after mount.
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!deadlineIso) return;
    const deadline = new Date(deadlineIso).getTime();
    const tick = () => setLeft(Math.max(0, deadline - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadlineIso]);
  return left;
}

function clock(ms: number) {
  const s = Math.floor(ms / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    } catch {
      /* clipboard unavailable (insecure context); the value is still visible to copy by hand */
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy ${label}`}
      className="flex h-9 w-[74px] items-center justify-center gap-1.5 rounded-lg border border-line bg-surface-2 text-xs font-bold text-text transition-colors hover:border-gold/50 focus-visible:focus-ring"
    >
      {done ? <Check size={12} aria-hidden className="text-success" /> : <Copy size={12} aria-hidden />}
      <span aria-live="polite">{done ? "Copied" : "Copy"}</span>
    </button>
  );
}

export function PaymentInstructions({ booking, event }: { booking: Booking; event: EventItem }) {
  const router = useRouter();
  const left = useCountdown(booking.payByIso);
  const amount = formatKrw(booking.total);

  const rows = [
    { label: "Bank", value: paymentAccount.bank },
    { label: "Account number", value: paymentAccount.number, mono: true },
    { label: "Account holder", value: paymentAccount.holder },
    { label: "Exact amount", value: amount, copy: String(booking.total) },
    { label: "Transfer memo", value: booking.id, mono: true },
  ];

  return (
    <div className="mx-auto grid max-w-site gap-8 px-5 py-10 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold/40 bg-gold/10 px-5 py-4">
          <p className="flex items-center gap-3 text-[13px] font-bold text-gold">
            <Clock size={16} aria-hidden />
            Pay within
            <span className="font-mono text-sm tracking-wider" suppressHydrationWarning>
              {left === null ? "--:--:--" : left === 0 ? "Expired" : clock(left)}
            </span>
          </p>
          {booking.payBy && <p className="text-xs text-muted">Seats held until {booking.payBy}</p>}
        </div>

        <Card className="border-gold/30 p-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-bold text-text">Transfer to</h2>
            <Badge tone="warning">Bank transfer</Badge>
          </div>
          <dl>
            {rows.map((r) => (
              <div key={r.label} className="flex items-center justify-between gap-4 border-b border-line py-4 last:border-b-0">
                <div>
                  <dt className="text-[11px] text-dim">{r.label}</dt>
                  <dd className={`mt-1 ${r.mono ? "font-mono text-base font-bold text-gold" : "text-sm font-bold text-text"}`}>{r.value}</dd>
                </div>
                <CopyButton value={r.copy ?? r.value} label={r.label.toLowerCase()} />
              </div>
            ))}
          </dl>
        </Card>

        <Card className="p-6">
          <h2 className="mb-5 text-lg font-bold text-text">How to pay</h2>
          <ol className="space-y-5">
            {[
              ["Open your bank app, Toss or KakaoPay", "Any Korean bank account works."],
              [`Send exactly ${amount} to the account above`, "A different amount slows down checking."],
              [`Write ${booking.id} in the memo`, "This is how we match your payment to your booking."],
              ["Take a screenshot of the completed transfer", "You will upload it on the next step."],
            ].map(([title, hint], i) => (
              <li key={title} className="flex gap-4">
                <span className="w-3 font-display text-base font-bold text-amber">{i + 1}</span>
                <div>
                  <p className="text-sm font-bold text-text">{title}</p>
                  <p className="mt-1 text-xs text-dim">{hint}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <div className="space-y-4 lg:sticky lg:top-[108px] lg:self-start">
        <OrderSummary
          event={event}
          lines={[
            ...booking.lines.map((l) => ({ label: `${l.qty} × ${l.ticketName}`, amount: l.qty * l.unitPrice })),
            { label: "Booking fee", amount: 0 },
          ]}
          total={booking.total}
        >
          <LinkButton href={`/bookings/${booking.id}/proof`} size="lg" className="w-full">
            <Upload size={16} aria-hidden /> I&apos;ve paid, upload proof
          </LinkButton>
          <Button
            variant="ghost"
            className="mt-2 w-full"
            // TODO: call the cancel-booking API, which releases the held seats.
            onClick={() => router.push("/my-tickets")}
          >
            Cancel booking
          </Button>
        </OrderSummary>

        <Card className="p-5">
          <p className="flex items-center gap-2 text-[13px] font-bold text-text">
            <HelpCircle size={14} aria-hidden className="text-amber" /> Paying from overseas?
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-dim">
            Contact us before you pay. International transfers can take 2–3 days and may lose fees on the way.
          </p>
        </Card>
      </div>
    </div>
  );
}
