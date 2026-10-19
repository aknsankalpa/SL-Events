"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { OrderDetails } from "@/components/account/OrderDetails";
import { TicketViewer } from "@/components/tickets/TicketViewer";
import { PageHeader, Breadcrumbs } from "@/components/ui/PageHeader";
import { Stepper } from "@/components/ui/Stepper";
import { canIssueTickets, customerCan, ticketsFor } from "@/lib/bookings";
import { BookingLoader } from "./BookingLoader";
import { PaymentInstructions } from "./PaymentInstructions";
import { PaymentStatusView } from "./PaymentStatusView";
import { ProofUploadForm } from "./ProofUploadForm";
import { ReceiptView } from "./ReceiptView";

function Redirect({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(to);
  }, [router, to]);
  return <p role="status" className="mx-auto max-w-site px-5 py-20 text-center text-sm text-muted">One moment…</p>;
}

const crumbs = (title: string, slug: string) => [
  { label: "Events", href: "/events" },
  ...(slug ? [{ label: title, href: `/events/${slug}` }] : [{ label: title }]),
  { label: "Book tickets" },
];

/** Bank-transfer instructions. Only for a booking that is still waiting for payment. */
export function PaymentScreen({ id }: { id: string }) {
  return (
    <BookingLoader id={id}>
      {(booking, event) =>
        booking.status !== "awaiting_payment" ? (
          <Redirect to={`/bookings/${id}`} />
        ) : (
          <>
            <PageHeader
              crumbs={crumbs(event.title, event.slug)}
              title="Pay by bank transfer"
              subtitle={`Booking ${booking.id} is reserved. Transfer the total to complete it.`}
            >
              <Stepper current={3} />
            </PageHeader>
            <PaymentInstructions booking={booking} event={event} />
          </>
        )
      }
    </BookingLoader>
  );
}

/** Upload payment proof. Only while the booking can still receive one. */
export function ProofScreen({ id }: { id: string }) {
  return (
    <BookingLoader id={id}>
      {(booking, event) =>
        !customerCan.uploadProof(booking) ? (
          <Redirect to={`/bookings/${id}`} />
        ) : (
          <>
            <PageHeader
              crumbs={crumbs(event.title, event.slug)}
              title="Upload payment proof"
              subtitle="Add a screenshot of your transfer so we can confirm your booking."
            >
              <Stepper current={4} />
            </PageHeader>
            <ProofUploadForm booking={booking} event={event} />
          </>
        )
      }
    </BookingLoader>
  );
}

/** The payment status screen: pending, confirmed, failed or expired. */
export function StatusScreen({ id, justSubmitted }: { id: string; justSubmitted?: boolean }) {
  return <BookingLoader id={id}>{(booking, event) => <PaymentStatusView booking={booking} event={event} justSubmitted={justSubmitted} />}</BookingLoader>;
}

/** QR tickets. They only exist when the payment rules allow it; otherwise this goes back to the payment status. */
export function TicketsScreen({ id }: { id: string }) {
  return (
    <BookingLoader id={id}>
      {(booking, event) =>
        !canIssueTickets(booking) ? (
          <Redirect to={`/bookings/${id}`} />
        ) : (
          <>
            <div className="mx-auto max-w-site px-5 pt-6">
              <Breadcrumbs crumbs={[{ label: "My tickets", href: "/my-tickets" }, { label: event.title }]} />
            </div>
            <TicketViewer event={event} bookingId={booking.id} tickets={ticketsFor(booking)} />
          </>
        )
      }
    </BookingLoader>
  );
}

export function ReceiptScreen({ id }: { id: string }) {
  return <BookingLoader id={id}>{(booking, event) => <ReceiptView booking={booking} event={event} />}</BookingLoader>;
}

export function OrderScreen({ id }: { id: string }) {
  return <BookingLoader id={id}>{(booking, event) => <OrderDetails booking={booking} event={event} />}</BookingLoader>;
}
