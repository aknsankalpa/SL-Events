"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import type { EventDraft, OrganizerEvent, OrgEventStatus } from "@/lib/organizer";

/**
 * The signed-in organizer's organization and events, from the server. Screens read `events` and the selected
 * `event`; they change events only through the actions below, which the server checks and answers.
 */

export type OrganizerInfo = { id: number; slug: string; name: string; role: "owner" | "manager" };
export type SaveResult = { ok: true; event: OrganizerEvent } | { ok: false; error: string; problems?: string[] };
export type StatusResult = { ok: true; status: OrgEventStatus; cancelledBookings?: number } | { ok: false; error: string };

type OrganizerState = {
  organizer: OrganizerInfo;
  events: OrganizerEvent[];
  eventId: string;
  /** The event picked in the portal's event switcher (a blank stand-in while the organizer has no events). */
  event: OrganizerEvent;
  setEventId: (id: string) => void;
  /** Creates an event from the wizard; with `submit` it goes to SL Events for review. */
  createEvent: (draft: EventDraft, submit: boolean) => Promise<SaveResult>;
  /** Saves an existing event; with `submit` it goes (again) for review. */
  saveEvent: (id: string, draft: EventDraft, submit?: boolean) => Promise<SaveResult>;
  setEventStatus: (id: string, action: "pause" | "resume" | "cancel") => Promise<StatusResult>;
  refresh: () => Promise<void>;
  /** Payments waiting to be checked, across all events. */
  pending: number;
  /** Called after a payment is approved or rejected so the sidebar badge stays in sync. */
  resolveOnePending: () => void;
};

const NO_EVENT: OrganizerEvent = {
  id: "",
  title: "No events yet",
  category: "culture",
  dateLabel: "",
  shortDate: "",
  sold: 0,
  capacity: 0,
  revenue: 0,
  pending: 0,
  status: "draft",
};

const OFFLINE = "We couldn't reach SL Events. Check your connection and try again.";

async function send<T>(url: string, method: string, body?: unknown): Promise<{ ok: boolean; status: number; data: T & { error?: string; problems?: string[] } }> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "same-origin",
    cache: "no-store",
  });
  return { ok: res.ok, status: res.status, data: (await res.json().catch(() => ({}))) as T & { error?: string; problems?: string[] } };
}

const Ctx = createContext<OrganizerState | null>(null);

export function OrganizerProvider({ children }: { children: ReactNode }) {
  const [organizer, setOrganizer] = useState<OrganizerInfo | null>(null);
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [problem, setProblem] = useState<string>();
  const [eventId, setEventId] = useState("");
  const [pendingDelta, setPendingDelta] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const [me, list] = await Promise.all([send<{ organizer: OrganizerInfo }>("/api/organizer/me", "GET"), send<{ events: OrganizerEvent[] }>("/api/organizer/events", "GET")]);
      if (!me.ok) return setProblem(me.data.error ?? "We couldn't load your organizer account.");
      setOrganizer(me.data.organizer);
      if (list.ok) {
        setEvents(list.data.events);
        setPendingDelta(0);
      }
    } catch {
      setProblem(OFFLINE);
    }
  }, []);

  useEffect(() => {
    // Loading from the server is the effect's whole job; the state it sets comes back asynchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const remember = useCallback((e: OrganizerEvent) => setEvents((list) => [e, ...list.filter((x) => x.id !== e.id)]), []);

  const createEvent = useCallback(
    async (draft: EventDraft, submit: boolean): Promise<SaveResult> => {
      try {
        const { ok, data } = await send<{ event: OrganizerEvent }>("/api/organizer/events", "POST", { draft, submit });
        if (!ok) return { ok: false, error: data.error ?? "Couldn't save the event.", problems: data.problems };
        remember(data.event);
        return { ok: true, event: data.event };
      } catch {
        return { ok: false, error: OFFLINE };
      }
    },
    [remember],
  );

  const saveEvent = useCallback(
    async (id: string, draft: EventDraft, submit = false): Promise<SaveResult> => {
      try {
        const { ok, data } = await send<{ event: OrganizerEvent }>(`/api/organizer/events/${encodeURIComponent(id)}`, "PUT", { draft, submit });
        if (!ok) return { ok: false, error: data.error ?? "Couldn't save the event.", problems: data.problems };
        remember(data.event);
        return { ok: true, event: data.event };
      } catch {
        return { ok: false, error: OFFLINE };
      }
    },
    [remember],
  );

  const setEventStatus = useCallback(
    async (id: string, action: "pause" | "resume" | "cancel"): Promise<StatusResult> => {
      try {
        const { ok, data } = await send<{ status: OrgEventStatus; cancelledBookings?: number }>(`/api/organizer/events/${encodeURIComponent(id)}/status`, "POST", { action });
        if (!ok) return { ok: false, error: data.error ?? "Couldn't change the event." };
        setEvents((list) => list.map((e) => (e.id === id ? { ...e, status: data.status } : e)));
        return { ok: true, status: data.status, cancelledBookings: data.cancelledBookings };
      } catch {
        return { ok: false, error: OFFLINE };
      }
    },
    [],
  );

  const resolveOnePending = useCallback(() => setPendingDelta((n) => n + 1), []);
  const pending = Math.max(0, events.reduce((n, e) => n + e.pending, 0) - pendingDelta);

  const value = useMemo<OrganizerState | null>(
    () =>
      organizer && {
        organizer,
        events,
        eventId,
        event: events.find((e) => e.id === eventId) ?? events[0] ?? NO_EVENT,
        setEventId,
        createEvent,
        saveEvent,
        setEventStatus,
        refresh,
        pending,
        resolveOnePending,
      },
    [organizer, events, eventId, createEvent, saveEvent, setEventStatus, refresh, pending, resolveOnePending],
  );

  if (!value) {
    return (
      <div role="status" className="flex min-h-screen items-center justify-center gap-3 bg-page px-5 text-center text-sm text-muted">
        {problem ? (
          <span className="max-w-sm">
            <ShieldAlert size={24} aria-hidden className="mx-auto mb-3 text-amber" />
            {problem}
          </span>
        ) : (
          <>
            <Loader2 size={16} aria-hidden className="animate-spin text-gold" /> Loading your events…
          </>
        )}
      </div>
    );
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOrganizer() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOrganizer must be used inside <OrganizerProvider>");
  return ctx;
}
