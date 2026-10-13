"use client";

import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Stepper } from "@/components/ui/Stepper";
import { categoryIdOf, formatEventDate, newId } from "@/lib/organizer";
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
      category: categoryIdOf(draft.category),
      dateLabel: formatEventDate(draft.date),
      shortDate: formatEventDate(draft.date),
      startsAt: draft.date ? `${draft.date}T${draft.starts || "18:00"}:00+09:00` : undefined,
      venue: [draft.venue, draft.address].filter(Boolean).join(", ") || undefined,
      sold: 0,
      capacity: cap,
      revenue: 0,
      pending: 0,
      status: "draft",
      draft,
    });
    router.push("/organizer/events");
  }

  return (
    <>
      <OrgPageHeader
        crumbs={[{ label: "Events", href: "/organizer/events" }, { label: "New event" }]}
        title="Create an event"
      >
        <Stepper current={step} steps={wizardSteps} label="Event creation progress" className="mt-5" />
      </OrgPageHeader>

      {children}

      {/* The actions sit at the end of every step, after the content the organizer has just filled in. */}
      <nav
        aria-label="Event creation actions"
        className="mt-8 flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          {step > 1 && (
            <Button variant="ghost" className="w-full sm:w-auto" onClick={() => router.push(routes[step - 2]!)}>
              <ArrowLeft size={16} aria-hidden /> Back
            </Button>
          )}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" className="border-line bg-surface text-text hover:bg-surface-2" onClick={saveDraft}>
            Save as draft
          </Button>
          {!last && (
            <Button onClick={() => router.push(routes[step]!)}>
              Continue <ArrowRight size={16} aria-hidden />
            </Button>
          )}
        </div>
      </nav>
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
