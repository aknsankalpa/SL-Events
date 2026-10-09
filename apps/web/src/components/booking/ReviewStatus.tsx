import { Check, Hourglass, Info, MessageCircle, QrCode, RefreshCw } from "lucide-react";
import { Card, EventThumb, Row } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { ticketSummary, type Booking } from "@/lib/bookings";
import type { EventItem } from "@/lib/data";
import { formatKrw } from "@/lib/format";

type StepState = "done" | "active" | "todo";

/** The "Payment under review" screen: shown right after proof is submitted, or for any booking under review. */
export function ReviewStatus({ booking, event }: { booking: Booking; event: EventItem }) {
  const proof = booking.proof;
  const steps: { title: string; detail: string; state: StepState }[] = [
    { title: "Booking created", detail: `${booking.createdAt ?? "Today"} · ${ticketSummary(booking)}`, state: "done" },
    {
      title: "Payment proof uploaded",
      detail: `${booking.createdAt?.split(" · ")[0] ?? "Today"} · ${proof?.uploadedAt ?? "just now"} · ${proof?.fileName ?? "your receipt"}`,
      state: "done",
    },
    { title: "Checking your payment", detail: "In progress · started 1:30 PM", state: "active" },
    { title: "QR tickets issued", detail: "You can show them at the entrance", state: "todo" },
  ];

  return (
    <div className="mx-auto grid max-w-site gap-8 px-5 py-10 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-5">
        <div className="flex items-center gap-5 rounded-xl border border-gold/30 bg-gradient-to-r from-gold/10 to-transparent p-6">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full border border-gold/50 bg-surface text-gold">
            <Hourglass size={24} aria-hidden />
          </span>
          <div>
            <h2 className="text-xl font-bold text-text">Usually ready within 2–6 hours</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              We check payments every day from 9 AM to 10 PM Korea time. You&apos;ll get an email and a notification as soon as your QR
              tickets are ready.
            </p>
          </div>
        </div>

        <Card className="p-6">
          <h2 className="mb-6 text-lg font-bold text-text">Progress</h2>
          <ol>
            {steps.map((s, i) => (
              <li key={s.title} className="relative flex gap-4 pb-8 last:pb-0">
                {i < steps.length - 1 && (
                  <span aria-hidden className={`absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 ${s.state === "done" ? "bg-amber" : "bg-line"}`} />
                )}
                <span
                  className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border text-xs ${
                    s.state === "done"
                      ? "border-transparent bg-gradient-to-b from-gold to-amber text-ink"
                      : s.state === "active"
                        ? "border-gold bg-surface text-gold"
                        : "border-line bg-surface-2 text-dim"
                  }`}
                >
                  {s.state === "done" ? <Check size={14} strokeWidth={3} aria-hidden /> : s.state === "active" ? <Hourglass size={14} aria-hidden /> : <QrCode size={14} aria-hidden />}
                </span>
                <div aria-current={s.state === "active" ? "step" : undefined}>
                  <p className={`text-sm font-bold ${s.state === "todo" ? "text-dim" : "text-text"}`}>{s.title}</p>
                  <p className="mt-1 text-[11px] text-dim">{s.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>

        <Card className="p-5">
          <p className="flex items-center gap-2 text-[13px] font-bold text-text">
            <Info size={14} aria-hidden className="text-muted" /> If we can&apos;t match your payment
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-dim">
            We&apos;ll tell you why, for example a different amount or a missing memo, and you can upload a new screenshot. Your seats stay
            held while we sort it out.
          </p>
        </Card>
      </div>

      <div className="space-y-3 lg:sticky lg:top-[108px] lg:self-start">
        <Card className="p-6">
          <h2 className="mb-5 text-lg font-bold text-text">Booking details</h2>
          <div className="flex items-center gap-4">
            <EventThumb category={event.category} size={52} />
            <div className="leading-tight">
              <p className="text-[13px] font-bold text-text">{event.title}</p>
              <p className="mt-1.5 text-[11px] text-dim">
                {event.longDate} · {event.time}
              </p>
              <p className="mt-0.5 text-[11px] text-dim">
                {event.venue}, {event.city}
              </p>
            </div>
          </div>
          <div className="mt-5 border-t border-line pt-3">
            <Row label="Booking" value={<span className="font-mono font-bold">{booking.id}</span>} />
            <Row label="Tickets" value={ticketSummary(booking)} />
            <Row label="Amount" value={formatKrw(booking.total)} strong />
            <Row label="Payment" value={booking.paymentMethod} />
          </div>
          {proof && (
            <div className="mt-3 flex items-center gap-3 border-t border-line pt-4">
              <span aria-hidden className="h-10 w-14 shrink-0 rounded bg-white/90" />
              <div className="min-w-0 leading-tight">
                <p className="truncate text-xs font-bold text-text">{proof.fileName}</p>
                <p className="mt-1 text-[11px] text-dim">Uploaded {proof.uploadedAt}</p>
              </div>
            </div>
          )}
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <LinkButton href={`/bookings/${booking.id}/proof`} variant="outline" className="border-line text-text hover:bg-surface-2">
            <RefreshCw size={14} aria-hidden /> Replace proof
          </LinkButton>
          <LinkButton href="/help" variant="outline" className="border-line text-text hover:bg-surface-2">
            <MessageCircle size={14} aria-hidden /> Contact us
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
