"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle2, Clock, Download, Hourglass, LifeBuoy, QrCode, RefreshCw, Upload, XCircle } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { Card, EventThumb, Row } from "@/components/ui/Card";
import { Badge } from "@/components/ui/StatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { Stepper } from "@/components/ui/Stepper";
import { canIssueTickets, paymentState, statusMeta, ticketSummary, type Booking } from "@/lib/bookings";
import type { EventItem } from "@/lib/data";
import { formatKrw } from "@/lib/format";
import { ReviewStatus } from "./ReviewStatus";

/**
 * One screen for the state of a payment: pending, confirmed, failed or expired (and cancelled). It tells the customer
 * what happened and what to do next. It only ever shows the state; nothing here can change a payment to paid.
 */
export function PaymentStatusView({ booking, event, justSubmitted }: { booking: Booking; event: EventItem; justSubmitted?: boolean }) {
  const state = paymentState(booking.status);
  const meta = statusMeta[booking.status];
  const title =
    state === "confirmed"
      ? "Payment confirmed"
      : state === "failed"
        ? "Payment failed"
        : state === "expired"
          ? "Booking expired"
          : state === "cancelled"
            ? "Booking cancelled"
            : booking.status === "under_review"
              ? "Payment under review"
              : "Waiting for your payment";

  return (
    <>
      <PageHeader
        crumbs={[{ label: "My tickets", href: "/my-tickets" }, { label: `Booking ${booking.id}` }]}
        title={title}
        titleAside={
          <Badge tone={meta.tone} dot={state === "confirmed" || state === "pending"}>
            {meta.label}
          </Badge>
        }
        subtitle={justSubmitted ? "Thanks. We've got your payment proof and we're checking your transfer now." : undefined}
      >
        {booking.status === "under_review" && <Stepper current={5} />}
      </PageHeader>

      {booking.status === "under_review" ? (
        <>
          <ReviewStatus booking={booking} event={event} />
          <div className="mx-auto max-w-site px-5 pb-10">
            <ResolvePending booking={booking} />
          </div>
        </>
      ) : (
        <div className="mx-auto grid max-w-site gap-8 px-5 py-10 lg:grid-cols-[1fr_22rem]">
          <div className="space-y-5">
            {state === "pending" && <AwaitingPayment booking={booking} />}
            {state === "confirmed" && <Confirmed booking={booking} />}
            {state === "failed" && <Failed booking={booking} />}
            {state === "expired" && <Expired booking={booking} event={event} />}
            {state === "cancelled" && <Cancelled booking={booking} event={event} />}
            {state === "pending" && <ResolvePending booking={booking} />}
          </div>
          <Sidebar booking={booking} event={event} />
        </div>
      )}
    </>
  );
}

function Banner({
  tone,
  Icon,
  title,
  children,
}: {
  tone: "success" | "warning" | "danger" | "neutral";
  Icon: typeof Clock;
  title: string;
  children: React.ReactNode;
}) {
  const box = {
    success: "border-success/40 bg-success/10",
    warning: "border-gold/40 bg-gold/10",
    danger: "border-danger/40 bg-danger/10",
    neutral: "border-line bg-surface",
  }[tone];
  const icon = { success: "text-success", warning: "text-gold", danger: "text-danger", neutral: "text-muted" }[tone];
  return (
    <div className={`flex items-start gap-5 rounded-xl border p-6 ${box}`}>
      <span className={`flex size-12 shrink-0 items-center justify-center rounded-full border border-current bg-surface ${icon}`}>
        <Icon size={22} aria-hidden />
      </span>
      <div className="min-w-0">
        <h2 className="text-xl font-bold text-text">{title}</h2>
        <div className="mt-2 space-y-3 text-[13px] leading-relaxed text-muted">{children}</div>
      </div>
    </div>
  );
}

function AwaitingPayment({ booking }: { booking: Booking }) {
  return (
    <Banner tone="warning" Icon={Clock} title="Your tickets are held for you">
      <p>
        Transfer <strong className="text-text">{formatKrw(booking.total)}</strong> and upload your proof{booking.payBy ? ` before ${booking.payBy} (Korea time)` : ""}.
        After that, the tickets go back on sale.
      </p>
      <div className="flex flex-wrap gap-3 pt-1">
        <LinkButton href={`/bookings/${booking.id}/payment`} size="sm">
          Transfer instructions
        </LinkButton>
        <LinkButton href={`/bookings/${booking.id}/proof`} size="sm" variant="outline" className="border-line text-text hover:bg-surface-2">
          <Upload size={14} aria-hidden /> Upload proof
        </LinkButton>
      </div>
    </Banner>
  );
}

function Confirmed({ booking }: { booking: Booking }) {
  const issued = canIssueTickets(booking);
  return (
    <Banner tone="success" Icon={CheckCircle2} title="Your payment is confirmed">
      <p>
        {issued
          ? "Your QR tickets are ready. Show them at the entrance."
          : "We're getting your tickets ready. This usually takes a moment."}
      </p>
      <div className="flex flex-wrap gap-3 pt-1">
        {issued && (
          <LinkButton href={`/my-tickets/${booking.id}`} size="sm">
            <QrCode size={14} aria-hidden /> View QR tickets
          </LinkButton>
        )}
        <LinkButton href={`/bookings/${booking.id}/receipt`} size="sm" variant="outline" className="border-line text-text hover:bg-surface-2">
          <Download size={14} aria-hidden /> Receipt
        </LinkButton>
      </div>
    </Banner>
  );
}

function Failed({ booking }: { booking: Booking }) {
  return (
    <>
      <Banner tone="danger" Icon={XCircle} title="We couldn't confirm your payment">
        <p role="alert" className="rounded-lg border border-danger/30 bg-surface px-4 py-3 text-text">
          {booking.rejectionNote ?? "The payment we received didn't match this booking."}
        </p>
        <p>Your tickets stay held{booking.payBy ? ` until ${booking.payBy}` : ""} while you fix this.</p>
        <div className="flex flex-wrap gap-3 pt-1">
          <LinkButton href={`/bookings/${booking.id}/proof`} size="sm" variant="danger">
            <RefreshCw size={14} aria-hidden /> Upload new proof
          </LinkButton>
          <LinkButton href={`/bookings/${booking.id}/payment`} size="sm" variant="outline" className="border-line text-text hover:bg-surface-2">
            Transfer instructions
          </LinkButton>
        </div>
      </Banner>
      <Card className="p-6">
        <h2 className="text-lg font-bold text-text">How to fix it</h2>
        <ol className="mt-4 space-y-3 text-[13px] leading-relaxed text-muted">
          <li>1. Read the reason above. If an amount is missing, send the difference to the same account with the same memo.</li>
          <li>2. Take a clear screenshot of each transfer, showing the amount, date and the memo.</li>
          <li>
            3. Upload them on the <Link href={`/bookings/${booking.id}/proof`} className="font-bold text-amber hover:text-gold">proof page</Link>. We check again within 2–6 hours.
          </li>
        </ol>
      </Card>
    </>
  );
}

function Expired({ booking, event }: { booking: Booking; event: EventItem }) {
  return (
    <>
      <Banner tone="neutral" Icon={AlertCircle} title="The payment time ran out">
        <p>
          We hold tickets for 24 hours. We didn&apos;t receive a payment proof for this booking in time, so the tickets went back on sale.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          {event.slug && (
            <LinkButton href={`/events/${event.slug}`} size="sm">
              Book again
            </LinkButton>
          )}
        </div>
      </Banner>
      <Card className="p-6">
        <h2 className="flex items-center gap-2 text-base font-bold text-text">
          <LifeBuoy size={16} aria-hidden className="text-amber" /> Already sent the money?
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          If you paid before the deadline, don&apos;t book again. Write to us with your booking number and your transfer screenshot and we&apos;ll
          sort it out.
        </p>
        <LinkButton href={`/contact?booking=${booking.id}`} variant="outline" size="sm" className="mt-4 border-line text-text hover:bg-surface-2">
          Contact support
        </LinkButton>
      </Card>
    </>
  );
}

function Cancelled({ booking, event }: { booking: Booking; event: EventItem }) {
  return (
    <Banner tone="neutral" Icon={XCircle} title="This booking was cancelled">
      <p>The tickets were released and no tickets exist for this booking.</p>
      <div className="flex flex-wrap gap-3 pt-1">
        {event.slug && (
          <LinkButton href={`/events/${event.slug}`} size="sm" variant="outline" className="border-line text-text hover:bg-surface-2">
            View the event
          </LinkButton>
        )}
        <LinkButton href={`/contact?booking=${booking.id}`} size="sm" variant="ghost">
          Contact support
        </LinkButton>
      </div>
    </Banner>
  );
}

/** What to do when a payment is still pending, in the order that usually fixes it. */
export function ResolvePending({ booking }: { booking: Booking }) {
  return (
    <Card className="p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text">
        <Hourglass size={16} aria-hidden className="text-amber" /> If your payment is still pending
      </h2>
      <ol className="mt-4 space-y-3 text-[13px] leading-relaxed text-muted">
        <li>
          1. <strong className="text-text">Check the amount.</strong> You need to send exactly {formatKrw(booking.total)}.
        </li>
        <li>
          2. <strong className="text-text">Check the memo.</strong> It should be <span className="font-mono text-gold">{booking.id}</span>, so we can match your transfer.
        </li>
        <li>
          3. <strong className="text-text">Check your proof.</strong> Upload a clear screenshot showing the amount and the memo.
        </li>
        <li>
          4. <strong className="text-text">Give it a few hours.</strong> We check payments every day from 9 AM to 10 PM Korea time, usually within 2–6 hours.
        </li>
        <li>
          5. <strong className="text-text">Still nothing?</strong> Write to us with your booking number and we&apos;ll look straight away.
        </li>
      </ol>
      <div className="mt-5 flex flex-wrap gap-3">
        {booking.status === "awaiting_payment" && (
          <LinkButton href={`/bookings/${booking.id}/payment`} size="sm" variant="outline" className="border-line text-text hover:bg-surface-2">
            Transfer instructions
          </LinkButton>
        )}
        <LinkButton href={`/bookings/${booking.id}/proof`} size="sm" variant="outline" className="border-line text-text hover:bg-surface-2">
          {booking.proof ? "Replace proof" : "Upload proof"}
        </LinkButton>
        <LinkButton href={`/contact?booking=${booking.id}`} size="sm" variant="ghost">
          <LifeBuoy size={14} aria-hidden /> Contact support
        </LinkButton>
      </div>
    </Card>
  );
}

function Sidebar({ booking, event }: { booking: Booking; event: EventItem }) {
  return (
    <div className="space-y-4 lg:sticky lg:top-[108px] lg:self-start">
      <Card className="p-6">
        <h2 className="mb-5 text-lg font-bold text-text">Booking details</h2>
        <div className="flex items-center gap-4">
          <EventThumb category={event.category} size={52} />
          <div className="leading-tight">
            <p className="text-[13px] font-bold text-text">{event.title}</p>
            <p className="mt-1.5 text-[11px] text-dim">{event.time ? `${event.longDate} · ${event.time}` : event.longDate}</p>
            {event.venue && event.city && (
              <p className="mt-0.5 text-[11px] text-dim">
                {event.venue}, {event.city}
              </p>
            )}
          </div>
        </div>
        <div className="mt-5 border-t border-line pt-3">
          <Row label="Booking" value={<span className="font-mono font-bold">{booking.id}</span>} />
          <Row label="Tickets" value={ticketSummary(booking)} />
          <Row label="Amount" value={formatKrw(booking.total)} strong />
          <Row label="Payment reference" value={<span className="font-mono">{booking.id}</span>} />
          <Row label="Payment" value={booking.paymentMethod} />
        </div>
        <LinkButton href={`/booking-history/${booking.id}`} variant="ghost" size="sm" className="mt-3 w-full">
          Order details
        </LinkButton>
      </Card>
    </div>
  );
}
