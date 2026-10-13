"use client";

import { useEffect } from "react";
import { PricingBody } from "../PricingPage";
import { useEventDraft } from "./EventDraft";

/** Step 3 reuses the Pricing screen; visiting it counts as reviewing prices for the checklist. */
export function PricingStep() {
  const { draft, patch } = useEventDraft();

  useEffect(() => {
    if (!draft.pricingReviewed) patch({ pricingReviewed: true });
  }, [draft.pricingReviewed, patch]);

  return <PricingBody />;
}
