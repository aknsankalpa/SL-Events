import type { Metadata } from "next";
import { BookingHistoryTable } from "@/components/account/BookingHistoryTable";

export const metadata: Metadata = { title: "Booking history" };

export default function BookingHistoryPage() {
  return <BookingHistoryTable />;
}
