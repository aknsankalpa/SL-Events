"use client";

import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Stepper } from "@/components/ui/Stepper";
import { newId } from "@/lib/organizer";
import { useOrganizer } from "../OrganizerContext";
import { OrgPageHeader } from "../ui";
import { EventDraftProvider, useEventDraft, capacityOf } from "./EventDraft";

export const wizardSteps = ["Details", "Tickets & seating", "Pricing", "Review & publish"] as const;

const routes = ["/organizer/events/new", "/organizer/events/new/tickets", "/organizer/events/new/pricing", "/organizer/events/new/review"];

function Frame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { draft } = useEventDraft();
  const { addEvent } = useOrganizer();

  const step = Math.max(1, routes.indexOf(pathname) + 1);
  const last = step === routes.length;

  function saveDraft() {
    const cap = draft.sellMode === "seats" ? 0 : capacityOf(draft.ticketTypes).tickets;
    // TODO: persist the draft through the API.
    addEvent({
      id: newId("draft"),
      title: draft.name.trim() || "Untitled event",
      category: "culture",
      dateLabel: draft.date,
      shortDate: draft.date,
      sold: 0,
      capacity: cap,
      revenue: 0,
      pending: 0,
      status: "draft",
    });
    router.push("/organizer/events");
  }

  return (
    <>
      <OrgPageHeader
        crumbs={[{ label: "Events", href: "/organizer/events" }, { label: "New event" }]}
        title="Create an event"
        actions={
          <>
            <Button variant="outline" className="border-line bg-surface text-text hover:bg-surface-2" onClick={saveDraft}>
              Save as draft
            </Button>
            {!last && (
              <Button onClick={() => router.push(routes[step]!)}>
                Continue <ArrowRight size={16} aria-hidden />
              </Button>
            )}
          </>
        }
      >
        <Stepper current={step} steps={wizardSteps} label="Event creation progress" className="mt-5" />
      </OrgPageHeader>
      {children}
    </>
  );
}

export function WizardFrame({ children }: { children: ReactNode }) {
  return (
    <EventDraftProvider>
      <Frame>{children}</Frame>
    </EventDraftProvider>
  );
}
