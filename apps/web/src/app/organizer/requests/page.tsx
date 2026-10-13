import type { Metadata } from "next";
import { RequestsPage } from "@/components/organizer/RequestsPage";

export const metadata: Metadata = { title: "Refund & cancellation requests" };

export default function OrganizerRequestsPage() {
  return <RequestsPage />;
}
