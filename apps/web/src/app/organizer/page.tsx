import type { Metadata } from "next";
import { Dashboard } from "@/components/organizer/Dashboard";

export const metadata: Metadata = { title: "Sales dashboard" };

export default function OrganizerDashboardPage() {
  return <Dashboard />;
}
