import { createPersistedStore } from "./persistedStore";
import { formatKst, ticketSummary, type Booking } from "./bookings";
import { formatKrw } from "./format";

export type NotificationKind = "booking" | "event" | "announcement";

export type Notification = {
  id: string;
  kind: NotificationKind;
  tone: "success" | "danger" | "warning" | "neutral";
  icon: "check" | "alert" | "hourglass" | "clock" | "calendar" | "sparkles" | "receipt" | "megaphone";
  /** Things the customer has to do come first. */
  attention?: boolean;
  title: string;
  body: string;
  time: string;
  action?: { label: string; href: string };
};

/** Announcements and event news, the same for everyone until the API sends real ones. */
export const staticNotifications: Notification[] = [
  {
    id: "a-hours",
    kind: "announcement",
    tone: "neutral",
    icon: "megaphone",
    title: "Payment checking hours",
    body: "We check bank-transfer payments every day from 9 AM to 10 PM Korea time (KST), usually within 2–6 hours.",
    time: "Announcement",
    action: { label: "Payment instructions", href: "/payment-instructions" },
  },
  {
    id: "a-welcome",
    kind: "announcement",
    tone: "neutral",
    icon: "sparkles",
    title: "Welcome to SL Events",
    body: "Book events, pay by bank transfer and keep your QR tickets in one place. Verify your email to keep your account safe.",
    time: "Announcement",
  },
  {
    id: "e-time-change",
    kind: "event",
    tone: "neutral",
    icon: "calendar",
    title: "Time change: Sinhala Movie Screening",
    body: "The screening on 21 Nov now starts at 7:30 PM instead of 7:00 PM.",
    time: "Event update",
    action: { label: "View event", href: "/events/sinhala-movie-screening" },
  },
  {
    id: "e-new",
    kind: "event",
    tone: "neutral",
    icon: "sparkles",
    title: "New event: Sri Lankan Dance Showcase",
    body: "Kandyan, low-country and folk dance, live in Daegu on 20 Dec.",
    time: "New event",
    action: { label: "View event", href: "/events/sri-lankan-dance-showcase" },
  },
];

/** Notifications about the customer's own bookings, worked out from where each booking stands. */
export function bookingNotifications(bookings: Booking[]): Notification[] {
  return bookings.flatMap((b): Notification[] => {
    const id = `b-${b.id}-${b.status}`;
    const base = { id, kind: "booking" as const };
    switch (b.status) {
      case "confirmed":
        return [
          {
            ...base,
            tone: "success",
            icon: "check",
            title: "Your tickets are ready",
            body: `Payment for ${b.eventTitle} (${b.id}) is confirmed. ${b.total === 0 ? "" : "Your receipt is ready too. "}Your QR tickets are in My tickets.`,
            time: b.verifiedAt ? formatKst(b.verifiedAt) : (b.createdAt ?? ""),
            action: { label: "View QR tickets", href: `/my-tickets/${b.id}` },
          },
        ];
      case "under_review":
        return [
          {
            ...base,
            tone: "warning",
            icon: "hourglass",
            title: "We received your payment proof",
            body: `${b.eventTitle} (${b.id}) is being checked. This usually takes 2–6 hours.`,
            time: b.proof?.uploadedAt ?? b.createdAt ?? "",
            action: { label: "Payment status", href: `/bookings/${b.id}` },
          },
        ];
      case "awaiting_payment":
        return [
          {
            ...base,
            attention: true,
            tone: "warning",
            icon: "clock",
            title: "Pay to keep your tickets",
            body: `${b.eventTitle} (${b.id}): transfer ${formatKrw(b.total)} and upload proof${b.payBy ? ` by ${b.payBy}` : ""}.`,
            time: b.createdAt ?? "",
            action: { label: "Payment details", href: `/bookings/${b.id}/payment` },
          },
        ];
      case "proof_rejected":
        return [
          {
            ...base,
            attention: true,
            tone: "danger",
            icon: "alert",
            title: "Payment failed",
            body: `${b.eventTitle} (${b.id}): ${b.rejectionNote ?? "we couldn't match your payment."}`,
            time: b.createdAt ?? "",
            action: { label: "Upload new proof", href: `/bookings/${b.id}/proof` },
          },
        ];
      case "expired":
        return [
          {
            ...base,
            tone: "neutral",
            icon: "alert",
            title: "Booking expired",
            body: `${b.eventTitle} (${b.id}): the payment time ran out and the ${ticketSummary(b)} were released.`,
            time: b.payBy ?? "",
            action: { label: "See details", href: `/bookings/${b.id}` },
          },
        ];
      default:
        return [];
    }
  });
}

/** Which notifications the customer has opened. Keeps ids only. */
export const readStore = createPersistedStore<string[]>("sl-events:notifications-read:v1", [], (stored) =>
  Array.isArray(stored) ? stored.filter((v): v is string => typeof v === "string") : [],
);
