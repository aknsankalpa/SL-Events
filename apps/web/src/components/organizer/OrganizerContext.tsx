"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { organizerEvents, pendingPaymentsTotal, type OrganizerEvent } from "@/lib/organizer";

type OrganizerState = {
  events: OrganizerEvent[];
  eventId: string;
  event: OrganizerEvent;
  setEventId: (id: string) => void;
  addEvent: (event: OrganizerEvent) => void;
  updateEvent: (id: string, patch: Partial<OrganizerEvent>) => void;
  pending: number;
  /** Called when a payment is approved or rejected so the sidebar badge stays in sync. */
  resolveOnePending: () => void;
};

const Ctx = createContext<OrganizerState | null>(null);

export function OrganizerProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<OrganizerEvent[]>(organizerEvents);
  const [eventId, setEventId] = useState(organizerEvents[0]!.id);
  const [pending, setPending] = useState(pendingPaymentsTotal);

  const resolveOnePending = useCallback(() => setPending((n) => Math.max(0, n - 1)), []);
  const addEvent = useCallback((e: OrganizerEvent) => setEvents((prev) => [e, ...prev]), []);
  const updateEvent = useCallback(
    (id: string, patch: Partial<OrganizerEvent>) => setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e))),
    [],
  );

  const value = useMemo<OrganizerState>(
    () => ({
      events,
      eventId,
      event: events.find((e) => e.id === eventId) ?? events[0]!,
      setEventId,
      addEvent,
      updateEvent,
      pending,
      resolveOnePending,
    }),
    [events, eventId, pending, addEvent, updateEvent, resolveOnePending],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOrganizer() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOrganizer must be used inside <OrganizerProvider>");
  return ctx;
}
