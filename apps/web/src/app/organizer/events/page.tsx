import type { Metadata } from "next";
import { EventsList } from "@/components/organizer/EventsList";

export const metadata: Metadata = { title: "Events" };

export default function OrganizerEventsPage() {
  return <EventsList />;
}
