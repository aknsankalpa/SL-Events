import type { Metadata } from "next";
import { History } from "lucide-react";
import { MyTicketsList } from "@/components/tickets/MyTicketsList";
import { LinkButton } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "My tickets" };

export default function MyTicketsPage() {
  return (
    <>
      <PageHeader
        title="My tickets"
        subtitle="Your bookings and QR tickets in one place."
        actions={
          <LinkButton href="/booking-history" variant="outline" className="border-line text-text hover:bg-surface-2">
            <History size={16} aria-hidden /> Booking history
          </LinkButton>
        }
      />
      <MyTicketsList />
    </>
  );
}
