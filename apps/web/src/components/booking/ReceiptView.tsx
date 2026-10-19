"use client";

import { Download, Printer, QrCode } from "lucide-react";
import { useSession } from "@/components/auth/useSession";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { canIssueTickets, formatKst, type Booking } from "@/lib/bookings";
import type { EventItem } from "@/lib/data";
import { formatKrw } from "@/lib/format";
import { downloadReceipt, receiptAvailable, receiptNumber } from "@/lib/receipt";

/** Booking confirmation and receipt. Only exists once the booking is paid and verified (or was free). */
export function ReceiptView({ booking, event }: { booking: Booking; event: EventItem }) {
  const { user } = useSession();
  const opts = { eventTitle: event.title, customer: user?.name ?? "Customer", email: user?.email ?? "" };

  if (!receiptAvailable(booking)) {
    return (
      <>
        <PageHeader crumbs={[{ label: "My tickets", href: "/my-tickets" }, { label: `Booking ${booking.id}` }]} title="Receipt" />
        <div className="mx-auto max-w-xl px-5 py-12 text-center">
          <p className="text-base font-bold text-text">Your receipt isn&apos;t ready yet</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            A receipt is issued once your payment has been confirmed. Check the booking to see where it is.
          </p>
          <LinkButton href={`/bookings/${booking.id}`} className="mt-6">
            View payment status
          </LinkButton>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        crumbs={[{ label: "My tickets", href: "/my-tickets" }, { label: `Booking ${booking.id}` }]}
        title="Booking confirmation"
        subtitle="Keep this for your records. You can print it or save it as a file."
        actions={
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button variant="outline" className="border-line text-text hover:bg-surface-2" onClick={() => window.print()}>
              <Printer size={16} aria-hidden /> Print or save as PDF
            </Button>
            <Button onClick={() => downloadReceipt(booking, opts)}>
              <Download size={16} aria-hidden /> Download receipt
            </Button>
          </div>
        }
      />
      <div className="mx-auto max-w-2xl px-5 py-10">
        <Card className="p-8">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
            <div>
              <p className="font-display text-2xl font-bold text-gold">SL Events</p>
              <p className="mt-1 text-xs text-dim">Booking confirmation and receipt</p>
            </div>
            <div className="text-right text-xs">
              <p className="font-bold text-text">{receiptNumber(booking)}</p>
              <p className="mt-1 text-dim">{formatKst(booking.verifiedAt ?? booking.createdIso ?? new Date(0).toISOString())} KST</p>
            </div>
          </div>

          <dl className="grid gap-4 border-b border-line py-6 text-[13px] sm:grid-cols-2">
            <Item label="Customer" value={`${opts.customer}${opts.email ? ` · ${opts.email}` : ""}`} />
            <Item label="Booking" value={booking.id} mono />
            <Item label="Event" value={event.title} />
            <Item label="When" value={event.time ? `${event.longDate} · ${event.time} KST` : event.longDate} />
            {event.venue && event.city && <Item label="Where" value={`${event.venue}, ${event.city}`} />}
            <Item label="Attendees" value={booking.attendees.join(", ")} />
          </dl>

          <table className="mt-6 w-full text-left text-[13px]">
            <thead className="text-[10px] uppercase tracking-wider text-dim">
              <tr>
                <th className="pb-2 font-bold">Ticket</th>
                <th className="pb-2 text-right font-bold">Qty</th>
                <th className="pb-2 text-right font-bold">Price</th>
                <th className="pb-2 text-right font-bold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {booking.lines.map((l) => (
                <tr key={l.ticketName} className="border-t border-line">
                  <td className="py-3 text-text">{l.ticketName}</td>
                  <td className="py-3 text-right text-muted">{l.qty}</td>
                  <td className="py-3 text-right text-muted">{formatKrw(l.unitPrice)}</td>
                  <td className="py-3 text-right font-bold text-text">{formatKrw(l.qty * l.unitPrice)}</td>
                </tr>
              ))}
              {booking.fee > 0 && (
                <tr className="border-t border-line">
                  <td className="py-3 text-muted" colSpan={3}>
                    Booking fee
                  </td>
                  <td className="py-3 text-right text-text">{formatKrw(booking.fee)}</td>
                </tr>
              )}
              <tr className="border-t-2 border-line">
                <td className="pt-4 text-base font-bold text-text" colSpan={3}>
                  Total paid
                </td>
                <td className="pt-4 text-right text-xl font-bold text-text">{formatKrw(booking.total)}</td>
              </tr>
            </tbody>
          </table>

          <dl className="mt-6 grid gap-4 border-t border-line pt-6 text-[13px] sm:grid-cols-2">
            <Item label="Payment method" value={booking.paymentMethod} />
            <Item label="Payment reference" value={booking.id} mono />
          </dl>
        </Card>

        {canIssueTickets(booking) && (
          <div className="mt-6 text-center print:hidden">
            <LinkButton href={`/my-tickets/${booking.id}`} variant="outline" className="border-line text-text hover:bg-surface-2">
              <QrCode size={16} aria-hidden /> View QR tickets
            </LinkButton>
          </div>
        )}
      </div>
    </>
  );
}

function Item({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-wider text-dim">{label}</dt>
      <dd className={`mt-1 text-text ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}
