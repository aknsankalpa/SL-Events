import type { Metadata } from "next";
import { ReviewStep } from "@/components/organizer/wizard/ReviewStep";

export const metadata: Metadata = { title: "Review & publish" };

export default function NewEventReviewPage() {
  return <ReviewStep />;
}
