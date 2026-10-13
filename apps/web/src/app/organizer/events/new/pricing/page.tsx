import type { Metadata } from "next";
import { PricingStep } from "@/components/organizer/wizard/PricingStep";

export const metadata: Metadata = { title: "Pricing · New event" };

export default function NewEventPricingPage() {
  return <PricingStep />;
}
