import type { Metadata } from "next";
import { TicketsStep } from "@/components/organizer/wizard/TicketsStep";

export const metadata: Metadata = { title: "Tickets & seating" };

export default function NewEventTicketsPage() {
  return <TicketsStep />;
}
