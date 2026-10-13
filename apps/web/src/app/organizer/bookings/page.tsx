import type { Metadata } from "next";
import { BookingsPage } from "@/components/organizer/BookingsPage";

export const metadata: Metadata = { title: "Bookings" };

export default function OrganizerBookingsPage() {
  return <BookingsPage />;
}
