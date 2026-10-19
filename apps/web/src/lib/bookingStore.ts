import {
  customerCan,
  formatKst,
  paymentRules,
  seedBookings,
  type Booking,
  type BookingLine,
  type BookingStatus,
} from "./bookings";
import { createPersistedStore } from "./persistedStore";

/**
 * The live list of bookings, kept in this browser until the API exists.
 *
 * Who may change what:
 *   - `customerActions`: create a booking, upload proof, cancel an unpaid booking. Everything a customer screen calls.
 *   - `staffActions`: confirm or reject a payment. Only the staff side (the organizer's payment verification) may use
 *     these. No customer component imports them, and when the API arrives they become server-side checks that a
 *     customer's session simply cannot reach.
 * The mock can't stop someone editing their own browser storage, so the read path also refuses to trust it: a paid
 * booking that claims "confirmed" without a staff verification is shown as still under review.
 */

const STATUSES: BookingStatus[] = ["confirmed", "under_review", "awaiting_payment", "proof_rejected", "expired", "cancelled", "attended"];
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

function normalize(stored: unknown): Booking[] {
  if (!Array.isArray(stored)) return seedBookings;
  return stored
    .filter(isRecord)
    .filter((b) => str(b.id))
    .map((b): Booking => {
      const lines: BookingLine[] = Array.isArray(b.lines)
        ? b.lines.filter(isRecord).map((l) => ({ ticketName: str(l.ticketName), qty: num(l.qty), unitPrice: num(l.unitPrice) }))
        : [];
      const total = num(b.total);
      let status = STATUSES.find((s) => s === b.status) ?? "under_review";
      const verifiedAt = str(b.verifiedAt) || undefined;
      // A paid booking is only "confirmed" or "attended" if staff verified the payment.
      if ((status === "confirmed" || status === "attended") && total > 0 && !verifiedAt) status = "under_review";
      return {
        id: str(b.id),
        ownerEmail: str(b.ownerEmail).toLowerCase(),
        eventSlug: str(b.eventSlug),
        eventTitle: str(b.eventTitle),
        eventDate: str(b.eventDate),
        status,
        lines,
        fee: num(b.fee),
        total,
        attendees: Array.isArray(b.attendees) ? b.attendees.map(str) : [],
        paymentMethod: b.paymentMethod === "—" ? "—" : "Bank transfer",
        createdIso: str(b.createdIso) || undefined,
        createdAt: str(b.createdAt) || undefined,
        proof: isRecord(b.proof)
          ? {
              fileName: str(b.proof.fileName),
              uploadedAt: str(b.proof.uploadedAt),
              sizeLabel: str(b.proof.sizeLabel),
              sender: str(b.proof.sender) || undefined,
              bank: str(b.proof.bank) || undefined,
            }
          : undefined,
        payBy: str(b.payBy) || undefined,
        payByIso: str(b.payByIso) || undefined,
        rejectionNote: str(b.rejectionNote) || undefined,
        statusNote: str(b.statusNote) || undefined,
        verifiedAt,
        verifiedBy: str(b.verifiedBy) || undefined,
        cancelledAt: str(b.cancelledAt) || undefined,
      };
    });
}

export const bookingStore = createPersistedStore<Booking[]>("sl-events:bookings:v2", seedBookings, normalize);

const find = (id: string) => bookingStore.getSnapshot().find((b) => b.id === id);
const patch = (id: string, change: Partial<Booking>) =>
  bookingStore.update((list) => list.map((b) => (b.id === id ? { ...b, ...change } : b)));

export type NewBooking = {
  ownerEmail: string;
  eventSlug: string;
  eventTitle: string;
  eventDate: string;
  lines: BookingLine[];
  fee: number;
  attendees: string[];
};

export type ProofInput = { fileName: string; sizeLabel: string; sender: string; bank: string };

export const customerActions = {
  /** Places a booking. Unpaid bookings are held for the configured time; free ones are confirmed straight away. */
  createBooking(input: NewBooking): Booking {
    const taken = new Set(bookingStore.getSnapshot().map((b) => b.id));
    let id = "";
    do id = `SL-${42000 + Math.floor(Math.random() * 9000)}`;
    while (taken.has(id));

    const now = new Date();
    const total = input.lines.reduce((n, l) => n + l.qty * l.unitPrice, 0) + input.fee;
    const free = total === 0 && paymentRules.freeBookingsConfirmInstantly;
    const payBy = new Date(now.getTime() + paymentRules.holdHours * 3600_000).toISOString();
    const booking: Booking = {
      ...input,
      id,
      ownerEmail: input.ownerEmail.toLowerCase(),
      status: free ? "confirmed" : "awaiting_payment",
      total,
      paymentMethod: free ? "—" : "Bank transfer",
      createdIso: now.toISOString(),
      createdAt: formatKst(now.toISOString()),
      payByIso: free ? undefined : payBy,
      payBy: free ? undefined : formatKst(payBy),
    };
    bookingStore.update((list) => [booking, ...list]);
    return booking;
  },

  /** Sends payment proof for checking. The booking moves to "under review"; it does not become paid. */
  submitProof(id: string, proof: ProofInput): boolean {
    const b = find(id);
    if (!b || !customerCan.uploadProof(b)) return false;
    patch(id, {
      status: "under_review",
      proof: { ...proof, uploadedAt: formatKst(new Date().toISOString()) },
      rejectionNote: undefined,
      statusNote: "Proof received · usually checked within 2–6 hours",
    });
    return true;
  },

  /** Cancels a booking that hasn't been paid for, which releases the held tickets. */
  cancelBooking(id: string): boolean {
    const b = find(id);
    if (!b || !customerCan.cancel(b)) return false;
    patch(id, { status: "cancelled", cancelledAt: new Date().toISOString() });
    return true;
  },
};

/** STAFF ONLY. Never import this from a customer component. */
export const staffActions = {
  confirmPayment(id: string, by: string): boolean {
    const b = find(id);
    if (!b || b.status !== "under_review") return false;
    patch(id, { status: "confirmed", verifiedAt: new Date().toISOString(), verifiedBy: by, statusNote: undefined });
    return true;
  },
  rejectProof(id: string, reason: string): boolean {
    const b = find(id);
    if (!b || b.status !== "under_review") return false;
    patch(id, { status: "proof_rejected", rejectionNote: reason, statusNote: undefined });
    return true;
  },
};
