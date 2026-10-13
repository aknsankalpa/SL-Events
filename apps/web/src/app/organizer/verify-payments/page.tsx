import type { Metadata } from "next";
import { VerifyPayments } from "@/components/organizer/VerifyPayments";

export const metadata: Metadata = { title: "Verify payments" };

export default function VerifyPaymentsPage() {
  return <VerifyPayments />;
}
