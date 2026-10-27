"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Circle, CreditCard, Download, LifeBuoy, QrCode, Upload, X } from "lucide-react";
import { useSession } from "@/components/auth/useSession";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card, EventThumb, Row } from "@/components/ui/Card";
import { Breadcrumbs } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { canIssueTickets, customerCan, formatKst, paymentState, ticketCount, type Booking } from "@/lib/bookings";
import { customerActions } from "@/lib/bookingStore";
import type { EventItem } from "@/lib/data";
import { formatKrw } from "@/lib/format";
import { downloadReceipt, receiptAvailable, receiptNumber } from "@/lib/receipt";

type Step = { label: string; at?: string; state: "done" | "current" | "todo" | "failed" };

function timeline(b: Booking): Step[] {
  const paid = paymentState(b.status) === "confirmed";
  const steps: Step[] = [{ label: "Booking placed", at: b.createdAt, state: "done" }];
  if (b.total > 0) {
    steps.push({ label: "Payment proof sent", at: b.proof?.uploadedAt, state: b.proof ? "done" : b.status === "awaiting_payment" ? "current" : "todo" });
    steps.push({
      label: b.status === "proof_rejected" ? "Payment failed" : "Payment verified",
      at: b.verifiedAt ? formatKst(b.verifiedAt) : undefined,
      state: paid ? "done" : b.status === "proof_rejected" ? "failed" : b.status === "under_review" ? "current" : "todo",
    });
  }
  if (b.status === "expired") steps.push({ label: "Booking expired", at: b.payBy, state: "failed" });
  if (b.status === "cancelled") steps.push({ label: "Booking cancelled", at: b.cancelledAt ? formatKst(b.cancelledAt) : undefined, state: "failed" });
  if (canIssueTickets(b)) steps.push({ label: "QR tickets issued", state: "done" });
  if (b.status === "attended") steps.push({ label: "Attended", state: "done" });
  return steps;
}

/** One booking in full: what was bought, who it's for, how it was paid, where it stands and what can be done next. */
export function OrderDetails({ booking: b, event }: { booking: Booking; event: EventItem }) {
  const router = useRouter();
  const { user } = useSession();
  const [confirming, setConfirming] = useState(false);
  const steps = timeline(b);
  const tickets = canIssueTickets(b);

  return (
    <div className="space-y-5">
      <Breadcrumbs crumbs={[{ label: "Booking history", href: "/booking-history" }, { label: `Booking ${b.id}` }]} />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[30px] font-bold leading-tight text-text">{b.eventTitle}</h1>
          <p className="mt-2 text-sm text-muted">
            Booking <span className="font-mono">{b.id}</span>
            {b.createdAt ? ` · placed ${b.createdAt}` : ""}
          </p>
        </div>
        <StatusBadge status={b.status} />
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-5">
          <Card className="p-6">
            <h2 className="text-lg font-bold text-text">Order</h2>
            <div className="mt-4 flex items-center gap-4">
              <EventThumb category={event.category} size={52} />
              <div className="leading-tight">
                <p className="text-[13px] font-bold text-text">{event.title}</p>
                <p className="mt-1.5 text-[11px] text-dim">{event.time ? `${event.longDate} · ${event.time} KST` : event.longDate}</p>
                {event.venue && event.city && (
                  <p className="mt-0.5 text-[11px] text-dim">
                    {event.venue}, {event.city}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-5 border-t border-line pt-3">
              {b.lines.map((l) => (
                <Row key={l.ticketName} label={`${l.qty} × ${l.ticketName}`} value={formatKrw(l.qty * l.unitPrice)} />
              ))}
              {b.fee > 0 && <Row label="Booking fee" value={formatKrw(b.fee)} />}
              <Row label="Total" value={formatKrw(b.total)} strong />
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-bold text-text">Attendees</h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {b.attendees.map((name, i) => (
                <li key={`${name}-${i}`} className="rounded-lg border border-line bg-surface-2 px-4 py-3 text-[13px] text-text">
                  {name || "Name to be added"}
                  {b.seats?.[i] && <span className="ml-2 text-dim">· Seat {b.seats[i]!.label}</span>}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-bold text-text">Payment</h2>
            <div className="mt-3">
              <Row label="Method" value={b.paymentMethod === "—" ? "Free: nothing to pay" : b.paymentMethod} />
              <Row label="Payment reference" value={<span className="font-mono font-bold">{b.id}</span>} />
              <Row label="Amount" value={formatKrw(b.total)} />
              {b.proof && <Row label="Proof" value={`${b.proof.fileName} · ${b.proof.sizeLabel}`} />}
              {b.proof?.sender && <Row label="Sent by" value={b.proof.sender} />}
              {b.verifiedAt && <Row label="Verified" value={`${formatKst(b.verifiedAt)}${b.verifiedBy ? ` · ${b.verifiedBy}` : ""}`} />}
              {receiptAvailable(b) && <Row label="Receipt number" value={<span className="font-mono">{receiptNumber(b)}</span>} />}
            </div>
            {b.rejectionNote && (
              <p role="alert" className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-xs leading-relaxed text-danger">
                {b.rejectionNote}
              </p>
            )}
          </Card>
        </div>

        <div className="space-y-5 lg:sticky lg:top-[108px]">
          <Card className="p-6">
            <h2 className="text-lg font-bold text-text">Progress</h2>
            <ol className="mt-4 space-y-4">
              {steps.map((s) => (
                <li key={s.label} className="flex gap-3">
                  <span
                    className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border ${
                      s.state === "done"
                        ? "border-transparent bg-gradient-to-b from-gold to-amber text-ink"
                        : s.state === "failed"
                          ? "border-danger text-danger"
                          : s.state === "current"
                            ? "border-gold text-gold"
                            : "border-line text-dim"
                    }`}
                  >
                    {s.state === "done" ? <Check size={11} strokeWidth={3} aria-hidden /> : s.state === "failed" ? <X size={11} aria-hidden /> : <Circle size={7} aria-hidden />}
                  </span>
                  <span className="leading-tight">
                    <span className={`block text-[13px] font-bold ${s.state === "todo" ? "text-dim" : "text-text"}`}>{s.label}</span>
                    {s.at && <span className="mt-0.5 block text-[11px] text-dim">{s.at}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </Card>

          <Card className="space-y-3 p-6">
            <h2 className="text-lg font-bold text-text">What you can do</h2>
            {tickets && (
              <LinkButton href={`/my-tickets/${b.id}`} className="w-full">
                <QrCode size={16} aria-hidden /> {b.status === "attended" ? "View tickets" : "View QR tickets"}
              </LinkButton>
            )}
            {b.status === "awaiting_payment" && (
              <LinkButton href={`/bookings/${b.id}/payment`} className="w-full">
                <CreditCard size={16} aria-hidden /> Pay by bank transfer
              </LinkButton>
            )}
            {customerCan.uploadProof(b) && b.status !== "under_review" && (
              <LinkButton href={`/bookings/${b.id}/proof`} variant="outline" className="w-full border-line text-text hover:bg-surface-2">
                <Upload size={16} aria-hidden /> {b.status === "proof_rejected" ? "Upload new proof" : "Upload proof"}
              </LinkButton>
            )}
            <LinkButton href={`/bookings/${b.id}`} variant="outline" className="w-full border-line text-text hover:bg-surface-2">
              Payment status
            </LinkButton>
            {receiptAvailable(b) && (
              <>
                <LinkButton href={`/bookings/${b.id}/receipt`} variant="outline" className="w-full border-line text-text hover:bg-surface-2">
                  View receipt
                </LinkButton>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => downloadReceipt(b, { eventTitle: event.title, customer: user?.name ?? "Customer", email: user?.email ?? "" })}
                >
                  <Download size={16} aria-hidden /> Download receipt
                </Button>
              </>
            )}

            {customerCan.cancel(b) &&
              (confirming ? (
                <div role="alert" className="rounded-lg border border-line bg-surface-2 p-4">
                  <p className="text-xs leading-relaxed text-muted">
                    Cancel this booking? The tickets go back on sale. Only cancel if you haven&apos;t sent any money.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                      Keep it
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      // TODO: call the cancel-booking API.
                      onClick={() => {
                        customerActions.cancelBooking(b.id);
                        setConfirming(false);
                        router.refresh();
                      }}
                    >
                      Cancel booking
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="ghost" className="w-full text-danger hover:text-danger" onClick={() => setConfirming(true)}>
                  Cancel booking
                </Button>
              ))}
            {!customerCan.cancel(b) && (b.status === "under_review" || b.status === "confirmed") && (
              <p className="text-[11px] leading-relaxed text-dim">
                Payment has been sent for this booking, so it can&apos;t be cancelled here.{" "}
                <Link href={`/contact?booking=${b.id}`} className="font-bold text-amber hover:text-gold">
                  Ask support
                </Link>
                .
              </p>
            )}
            <LinkButton href={`/contact?booking=${b.id}`} variant="ghost" size="sm" className="w-full">
              <LifeBuoy size={14} aria-hidden /> Get help with this booking
            </LinkButton>
          </Card>
          <p className="px-1 text-[11px] text-dim">
            {ticketCount(b)} ticket{ticketCount(b) === 1 ? "" : "s"} · paid by {b.paymentMethod === "—" ? "no payment needed" : b.paymentMethod.toLowerCase()}
          </p>
        </div>
      </div>
    </div>
  );
}
