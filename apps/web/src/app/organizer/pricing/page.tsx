import type { Metadata } from "next";
import { PricingPage } from "@/components/organizer/PricingPage";

export const metadata: Metadata = { title: "Pricing" };

export default function OrganizerPricingPage() {
  return <PricingPage />;
}
