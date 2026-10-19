"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { CreditCard, Landmark, Pencil, Smartphone, Sparkles } from "lucide-react";
import { OrderSummary } from "@/components/booking/OrderSummary";
import { BOOKING_FEE, MAX_TICKETS } from "@/components/booking/TicketSelector";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Checkbox, Field } from "@/components/ui/Field";
import { useSession } from "@/components/auth/useSession";
import { useOnline } from "@/components/layout/OfflineBanner";
import { customerActions } from "@/lib/bookingStore";
import { currentUser, paymentAccount, ticketsLeft, type EventItem } from "@/lib/data";
import { formatKrw } from "@/lib/format";

/** Parses `?tickets=general:2,vip:1` into ordered, validated lines. */
function parseTickets(event: EventItem, raw: string | null) {
  const wanted = new Map(
    (raw ?? "")
      .split(",")
      .map((pair) => pair.split(":"))
      .filter(([id, q]) => id && Number(q) > 0)
      .map(([id, q]) => [id, Math.floor(Number(q))] as const),
  );
  // The link is only a suggestion: quantities are held to what is still on sale and to the per-booking limit.
  let room = MAX_TICKETS;
  return event.ticketTypes.flatMap((t) => {
    const qty = Math.min(wanted.get(t.id) ?? 0, ticketsLeft(t), room);
    room -= Math.max(0, qty);
    return qty > 0 ? [{ type: t, qty }] : [];
  });
}

export function BookingSummaryForm({ event }: { event: EventItem }) {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useSession();
  const online = useOnline();
  const fullName = user?.name ?? currentUser.fullName;
  const email = user?.email ?? currentUser.email;
  const selection = useMemo(() => parseTickets(event, params.get("tickets")), [event, params]);

  const attendeeSlots = selection.flatMap(({ type, qty }) => Array.from({ length: qty }, (_, i) => ({ type, key: `${type.id}-${i}` })));
  const [names, setNames] = useState<string[]>(() => attendeeSlots.map((_, i) => (i === 0 ? fullName : "")));
  const [promo, setPromo] = useState("");
  const [promoMessage, setPromoMessage] = useState<string>();
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [agreeData, setAgreeData] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  if (selection.length === 0) {
    return (
      <div className="mx-auto max-w-site px-5 py-16 text-center">
        <p className="text-base font-bold text-text">No tickets selected</p>
        <p className="mt-2 text-sm text-muted">Choose your tickets first, then come back to review your booking.</p>
        <LinkButton href={`/events/${event.slug}/book`} className="mt-6">
          Choose tickets
        </LinkButton>
      </div>
    );
  }

  const subtotal = selection.reduce((n, { type, qty }) => n + type.price * qty, 0);
  const total = subtotal + BOOKING_FEE;
  const missingName = names.some((n) => !n.trim());
  const canConfirm = agreeTerms && agreeData && !missingName;

  function confirm() {
    setSubmitted(true);
    if (!canConfirm || !user) return;
    // TODO: POST the booking to the API, which re-checks availability and limits, then use the id it returns.
    // The booking starts unpaid (or confirmed when there is nothing to pay). It is marked paid only by staff.
    const booking = customerActions.createBooking({
      ownerEmail: user.email,
      eventSlug: event.slug,
      eventTitle: event.title,
      eventDate: event.longDate.replace(/^\w+, /, ""),
      lines: selection.map(({ type, qty }) => ({ ticketName: type.name, qty, unitPrice: type.price })),
      fee: BOOKING_FEE,
      attendees: names.map((n) => n.trim()),
    });
    router.push(booking.status === "confirmed" ? `/bookings/${booking.id}` : `/bookings/${booking.id}/payment`);
  }

  return (
    <div className="mx-auto grid max-w-site gap-8 px-5 py-10 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-5">
        <Card className="p-6">
          <CardTitle
            action={
              <Link href="/profile" className="flex items-center gap-1.5 text-xs font-bold text-amber hover:text-gold">
                <Pencil size={12} aria-hidden /> Edit
              </Link>
            }
          >
            Your details
          </CardTitle>
          <dl className="grid gap-4 sm:grid-cols-2">
            {[
              ["Name", fullName],
              ["Email", email],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-dim">{k}</dt>
                <dd className="mt-1 text-[13px] font-bold text-text">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="p-6">
          <CardTitle>Names on tickets</CardTitle>
          <p className="-mt-2 mb-5 text-xs text-dim">Staff may compare the name with your ID at the door.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {attendeeSlots.map((slot, i) => (
              <Field
                key={slot.key}
                label={`Ticket ${i + 1} · ${slot.type.name}`}
                value={names[i] ?? ""}
                onChange={(e) => setNames((prev) => prev.map((n, j) => (j === i ? e.target.value : n)))}
                autoComplete="name"
                placeholder="Full name as on ID"
                error={submitted && !names[i]?.trim() ? "Enter the name for this ticket." : undefined}
              />
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <CardTitle>Payment method</CardTitle>
          {total === 0 ? (
            <p className="-mt-2 text-[13px] text-muted">Nothing to pay for this booking. Your tickets are issued as soon as you confirm.</p>
          ) : (
            <>
              <ul className="-mt-2 space-y-3" role="radiogroup" aria-label="Payment method">
                <li>
                  <label className="flex cursor-pointer items-start gap-4 rounded-xl border border-gold/70 bg-gold/5 p-4">
                    <input type="radio" name="method" defaultChecked className="mt-1 accent-[#e8a83a]" aria-label="Bank transfer" />
                    <span className="flex-1">
                      <span className="flex items-center gap-2 text-[13px] font-bold text-text">
                        <Landmark size={15} aria-hidden className="text-gold" /> Bank transfer
                        <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold uppercase text-success">Available</span>
                      </span>
                      <span className="mt-1 block text-[11px] leading-relaxed text-dim">
                        Send the total from your banking app, then upload a screenshot. We check it and issue your QR tickets.
                      </span>
                    </span>
                  </label>
                </li>
                {[
                  { Icon: CreditCard, name: "Card" },
                  { Icon: Smartphone, name: "Mobile wallet" },
                ].map(({ Icon, name }) => (
                  <li key={name}>
                    <label className="flex cursor-not-allowed items-center gap-4 rounded-xl border border-line p-4 opacity-60">
                      <input type="radio" name="method" disabled className="accent-[#e8a83a]" aria-label={`${name} (not available)`} />
                      <span className="flex flex-1 items-center gap-2 text-[13px] font-bold text-text">
                        <Icon size={15} aria-hidden className="text-dim" /> {name}
                      </span>
                      <span className="text-[10px] font-bold uppercase text-dim">Not available yet</span>
                    </label>
                  </li>
                ))}
              </ul>
              <div className="mt-5 rounded-lg border border-line bg-surface-2 p-4 text-[12px] leading-relaxed text-muted">
                <p className="font-bold text-text">Transfer instructions</p>
                <p className="mt-1">
                  After you confirm, you&apos;ll see the exact amount and your booking number to use as the memo. You&apos;ll send it to{" "}
                  <strong className="text-text">{paymentAccount.holder}</strong> at <strong className="text-text">{paymentAccount.bank}</strong>, then upload your receipt.
                  Tickets are held for 24 hours.
                </p>
              </div>
            </>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="p-6 pb-4">
            <h2 className="text-lg font-bold text-text">Order</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[30rem] text-left text-[13px]">
              <thead className="bg-surface-2 text-[10px] uppercase tracking-wider text-dim">
                <tr>
                  <th className="px-6 py-3 font-bold">Ticket</th>
                  <th className="px-3 py-3 font-bold">Price</th>
                  <th className="px-3 py-3 font-bold">Quantity</th>
                  <th className="px-6 py-3 font-bold">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {selection.map(({ type, qty }) => (
                  <tr key={type.id} className="border-t border-line">
                    <td className="px-6 py-4">
                      <p className="font-bold text-text">{type.name}</p>
                      <p className="mt-0.5 text-[11px] text-dim">{type.summary ?? type.perks[0]}</p>
                    </td>
                    <td className="px-3 py-4 text-muted">{formatKrw(type.price)}</td>
                    <td className="px-3 py-4 text-muted">{qty}</td>
                    <td className="px-6 py-4 font-bold text-text">{formatKrw(type.price * qty)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <form
            className="flex gap-3 border-t border-line p-6"
            onSubmit={(e) => {
              e.preventDefault();
              // TODO: validate against the API.
              setPromoMessage(promo.trim() ? "That code isn't valid for this event." : undefined);
            }}
          >
            <label className="flex flex-1 items-center gap-3 rounded-lg border border-line bg-surface-2 px-4 focus-within:border-gold">
              <Sparkles size={16} className="text-dim" aria-hidden />
              <span className="sr-only">Promo code</span>
              <input
                value={promo}
                onChange={(e) => setPromo(e.target.value)}
                placeholder="Promo code"
                className="h-12 w-full bg-transparent text-sm text-text placeholder:text-dim focus:outline-none"
              />
            </label>
            <Button type="submit" variant="outline" className="h-12 border-line text-text hover:bg-surface-2">
              Apply
            </Button>
          </form>
          {promoMessage && <p className="-mt-3 px-6 pb-4 text-xs text-danger">{promoMessage}</p>}
        </Card>

        <Card className="p-6">
          <CardTitle>Before you confirm</CardTitle>
          <div className="space-y-4">
            <Checkbox
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              label={
                <>
                  I agree to the <Link href="/terms" className="text-text hover:underline">Terms and conditions</Link>. (Required)
                </>
              }
            />
            <Checkbox
              checked={agreeData}
              onChange={(e) => setAgreeData(e.target.checked)}
              label="I consent to SL Events and the organizer using my name and email to issue tickets. (Required)"
            />
            {submitted && (!agreeTerms || !agreeData) && (
              <p className="text-xs text-danger">Please accept both to continue.</p>
            )}
          </div>
        </Card>
      </div>

      <div className="lg:sticky lg:top-[108px] lg:self-start">
        <OrderSummary
          event={event}
          lines={[
            ...selection.map(({ type, qty }) => ({ label: `${qty} × ${type.name}`, amount: type.price * qty })),
            { label: "Booking fee", amount: BOOKING_FEE },
          ]}
          total={total}
        >
          <div className="mb-5 flex items-start gap-3 rounded-lg bg-surface-2 p-4">
            <Landmark size={16} aria-hidden className="mt-0.5 text-gold" />
            <div className="leading-tight">
              <p className="text-[13px] font-bold text-text">{total === 0 ? "No payment needed" : "Payment by bank transfer"}</p>
              <p className="mt-1 text-[11px] text-dim">{total === 0 ? "Your tickets are issued straight away." : "You'll get the account details next."}</p>
            </div>
          </div>
          <Button size="lg" className="w-full" onClick={confirm} disabled={!online}>
            Confirm booking
          </Button>
          {!online && <p role="alert" className="mt-3 text-center text-[11px] text-amber">You&apos;re offline. Reconnect to book.</p>}
          <p className="mt-3 text-center text-[11px] text-dim">{total === 0 ? "Free booking." : "Pay within 24 hours or the seats are released."}</p>
        </OrderSummary>
      </div>
    </div>
  );
}
