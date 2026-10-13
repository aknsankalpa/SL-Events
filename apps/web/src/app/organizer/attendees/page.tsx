import type { Metadata } from "next";
import { AttendeesPage } from "@/components/organizer/AttendeesPage";

export const metadata: Metadata = { title: "Attendees" };

export default function OrganizerAttendeesPage() {
  return <AttendeesPage />;
}
