import type { Metadata } from "next";
import { DetailsStep } from "@/components/organizer/wizard/DetailsStep";

export const metadata: Metadata = { title: "Create an event" };

export default function NewEventDetailsPage() {
  return <DetailsStep />;
}
