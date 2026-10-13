import type { Metadata } from "next";
import { TicketTypesPage } from "@/components/organizer/TicketTypesPage";

export const metadata: Metadata = { title: "Ticket types" };

export default function OrganizerTicketTypesPage() {
  return <TicketTypesPage />;
}
