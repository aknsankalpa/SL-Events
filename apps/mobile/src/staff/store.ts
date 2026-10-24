import { useSyncExternalStore } from "react";
import { createPersistedStore } from "@core/persistedStore";
import { canIssueTickets, ticketsFor } from "@core/bookings";
import { bookingStore } from "@core/bookingStore";
import type { StaffProfile } from "@/lib/roles";
import { directoryFor, ruleFor, staffEvent, type Outcome, type TicketInfo } from "./data";

/**
 * Scans made on this phone, kept until the API exists. In production the server answers every scan and marks the
 * ticket used in the same step, so two phones can never admit the same ticket. Here the phone is the only scanner.
 */

export type ScanResult = {
  id: string;
  eventId: string;
  at: string;
  /** "6:41 PM" in Korea time. */
  time: string;
  code: string;
  outcome: Outcome;
  name: string;
  ticket: string;
  booking: string;
  gate: string;
  by: string;
  /** Result-screen detail rows beyond name and ticket. */
  area?: string;
  allowedAt?: string;
  firstScan?: { time: string; gate: string; by: string };
  cancelledOn?: string;
  otherEvent?: string;
  /** "2 of 2 tickets in this booking are now checked in." */
  bookingProgress?: { checked: number; total: number };
};

type ScanData = { used: Record<string, { time: string; gate: string; by: string }>; log: ScanResult[] };
type Scans = Record<string, ScanData>;

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

export const scanStore = createPersistedStore<Scans>("sl-events:staff-scans:v1", {}, (stored) => {
  if (!isRecord(stored)) return {};
  const out: Scans = {};
  for (const [id, v] of Object.entries(stored)) {
    if (!isRecord(v)) continue;
    out[id] = {
      used: isRecord(v.used) ? (v.used as ScanData["used"]) : {},
      log: Array.isArray(v.log) ? (v.log.filter(isRecord) as unknown as ScanResult[]) : [],
    };
  }
  return out;
});

/** Which event and door this phone is working, plus the demo "no connection" switch. */
export type StaffState = { eventId: string; gate: string; offline: boolean };
const defaultState: StaffState = { eventId: "music-night", gate: "Main door", offline: false };

export const stateStore = createPersistedStore<StaffState>("sl-events:staff-state:v1", defaultState, (stored) => {
  const s = isRecord(stored) ? stored : {};
  return {
    eventId: typeof s.eventId === "string" && staffEvent(s.eventId) ? s.eventId : defaultState.eventId,
    gate: typeof s.gate === "string" && s.gate ? s.gate : defaultState.gate,
    offline: s.offline === true,
  };
});

export const useStaffState = () => useSyncExternalStore(stateStore.subscribe, stateStore.getSnapshot, stateStore.getServerSnapshot);
export const useScans = () => useSyncExternalStore(scanStore.subscribe, scanStore.getSnapshot, scanStore.getServerSnapshot);

export const selectEvent = (eventId: string) => {
  const e = staffEvent(eventId);
  if (e) stateStore.update((s) => ({ ...s, eventId, gate: e.gate }));
};
export const selectGate = (gate: string) => stateStore.update((s) => ({ ...s, gate }));
export const setOffline = (offline: boolean) => stateStore.update((s) => ({ ...s, offline }));

const kstTime = (d = new Date()) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Seoul" });

/** Every ticket that exists for an event: the organizer's list plus tickets customers booked in the app and were confirmed. */
function ticketsOf(eventId: string): TicketInfo[] {
  const list = [...directoryFor(eventId)];
  const slug = staffEvent(eventId)?.slug;
  if (slug) {
    for (const b of bookingStore.getSnapshot()) {
      if (b.eventSlug !== slug) continue;
      for (const t of ticketsFor(b)) {
        if (!list.some((x) => x.code === t.code)) list.push({ code: t.code, name: t.holder, ticket: t.ticketName, booking: b.id, state: canIssueTickets(b) ? "valid" : "unpaid" });
      }
    }
  }
  return list;
}

/**
 * Checks one scanned or typed code and records the result. Order matters: a ticket that is not an SL Events ticket is
 * refused first, then cancelled, unpaid, other-event, already-used and wrong-door tickets, and only then admitted.
 */
export function checkTicket(eventId: string, gate: string, rawCode: string, staff: StaffProfile): ScanResult {
  const code = rawCode.trim().toUpperCase();
  const all = scanStore.getSnapshot();
  const data: ScanData = all[eventId] ?? { used: {}, log: [] };
  const tickets = ticketsOf(eventId);
  const info = /^SLE-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code) ? tickets.find((t) => t.code === code) : undefined;
  const now = new Date();
  const base = { id: `${now.getTime()}-${Math.random().toString(36).slice(2, 6)}`, eventId, at: now.toISOString(), time: kstTime(now), code, gate, by: staff.firstName };

  let result: ScanResult;
  if (!info) {
    result = { ...base, outcome: "invalid", name: "Unknown", ticket: "—", booking: "—" };
  } else {
    const rule = ruleFor(info.ticket);
    const known = { name: info.name, ticket: info.ticket, booking: info.booking, area: rule.area, allowedAt: rule.allowedAt };
    const used = data.used[code] ?? info.firstScan;
    if (info.state === "cancelled") result = { ...base, ...known, outcome: "cancelled", cancelledOn: info.cancelledOn };
    else if (info.state === "unpaid") result = { ...base, ...known, outcome: "not_paid" };
    else if (info.otherEvent) result = { ...base, ...known, outcome: "wrong_event", otherEvent: info.otherEvent };
    else if (used) result = { ...base, ...known, outcome: "already_used", firstScan: used };
    else if ((rule.gate && gate !== rule.gate) || (!rule.gate && gate === "VIP entrance")) result = { ...base, ...known, outcome: "wrong_entrance" };
    else {
      const mates = tickets.filter((t) => t.booking === info.booking && t.state === "valid");
      const checked = mates.filter((t) => t.code === code || data.used[t.code] || t.firstScan).length;
      result = { ...base, ...known, outcome: "admit", bookingProgress: { checked, total: mates.length } };
    }
  }

  scanStore.set({
    ...all,
    [eventId]: {
      used: result.outcome === "admit" ? { ...data.used, [code]: { time: result.time, gate, by: staff.firstName } } : data.used,
      log: [result, ...data.log].slice(0, 200),
    },
  });
  return result;
}

export const resultById = (eventId: string, id: string): ScanResult | undefined => scanStore.getSnapshot()[eventId]?.log.find((r) => r.id === id);

/** A one-shot request from the result screen to open the "type the code" box when the scanner comes back into view. */
export const scanRequests = { typeCode: false };
