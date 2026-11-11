import { useSyncExternalStore } from "react";
import { createPersistedStore } from "@core/persistedStore";
import { api } from "@/lib/api";
import { loadStaff, ruleFor, staffEvent, type Outcome, type StaffProfile } from "./data";

/**
 * Checking tickets in. Every scan goes to the website, which admits a ticket once (even with several phones at the
 * door) and logs it. This phone keeps its own recent results only so the result screen can show them.
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
  /** For "too early" and "too late": when check-in opens or closed. */
  timing?: string;
  /** "2 of 2 tickets in this booking are now checked in." */
  bookingProgress?: { checked: number; total: number };
};

type ScanData = { log: ScanResult[] };
type Scans = Record<string, ScanData>;

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

export const scanStore = createPersistedStore<Scans>("sl-events:staff-scans:v2", {}, (stored) => {
  if (!isRecord(stored)) return {};
  const out: Scans = {};
  for (const [id, v] of Object.entries(stored)) {
    if (isRecord(v) && Array.isArray(v.log)) out[id] = { log: v.log.filter(isRecord) as unknown as ScanResult[] };
  }
  return out;
});

/** Which event and door this phone is working, plus the "no connection" switch for trying the offline screen. */
export type StaffState = { eventId: string; gate: string; offline: boolean };
const defaultState: StaffState = { eventId: "", gate: "Main door", offline: false };

export const stateStore = createPersistedStore<StaffState>("sl-events:staff-state:v2", defaultState, (stored) => {
  const s = isRecord(stored) ? stored : {};
  return {
    eventId: typeof s.eventId === "string" ? s.eventId : "",
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

type Answer = {
  outcome?: "admitted" | "already_used" | "not_found" | "wrong_event" | "not_paid" | "cancelled" | "too_early" | "too_late";
  holder?: string;
  ticket?: string;
  seat?: string;
  booking?: string;
  eventTitle?: string;
  opensAt?: string;
  cutoffAt?: string;
  firstScan?: { time: string; gate: string; by: string };
  bookingProgress?: { checked: number; total: number };
  error?: string;
};

const OUTCOME: Record<NonNullable<Answer["outcome"]>, Outcome> = {
  admitted: "admit",
  already_used: "already_used",
  not_found: "invalid",
  wrong_event: "wrong_event",
  not_paid: "not_paid",
  cancelled: "cancelled",
  too_early: "too_early",
  too_late: "too_late",
};

/**
 * Asks the website about one scanned or typed code and keeps the answer for the result screen. Returns null (with the
 * reason) when the website can't be reached: nobody is let in without the website's answer.
 */
export async function checkTicket(eventId: string, gate: string, rawCode: string, staff: StaffProfile): Promise<{ result?: ScanResult; error?: string }> {
  const code = rawCode.trim().toUpperCase();
  const { ok, status, data } = await api<Answer>("/api/staff/checkin", { body: { eventId: Number(eventId), code, gate } });
  if (!ok || !data.outcome) return { error: status === 0 ? "No connection. Nobody can be let in until the phone is back online." : (data.error ?? "The ticket couldn't be checked.") };

  const now = new Date();
  const ticket = [data.ticket, data.seat ? `Seat ${data.seat}` : ""].filter(Boolean).join(" · ") || "—";
  const rule = data.ticket ? ruleFor(data.ticket) : undefined;
  const result: ScanResult = {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 6)}`,
    eventId,
    at: now.toISOString(),
    time: kstTime(now),
    code,
    gate,
    by: staff.firstName,
    outcome: OUTCOME[data.outcome],
    name: data.holder ?? "Unknown",
    ticket,
    booking: data.booking ?? "—",
    area: rule?.area,
    allowedAt: rule?.allowedAt,
    firstScan: data.firstScan,
    otherEvent: data.outcome === "wrong_event" ? data.eventTitle : undefined,
    timing: data.outcome === "too_early" ? data.opensAt : data.outcome === "too_late" ? data.cutoffAt : undefined,
    bookingProgress: data.bookingProgress,
  };
  const all = scanStore.getSnapshot();
  scanStore.set({ ...all, [eventId]: { log: [result, ...(all[eventId]?.log ?? [])].slice(0, 200) } });
  // The numbers on the other tabs come from the website; ask it again so they include this scan.
  void loadStaff(staff.email);
  return { result };
}

export const resultById = (eventId: string, id: string): ScanResult | undefined => scanStore.getSnapshot()[eventId]?.log.find((r) => r.id === id);

/** A one-shot request from the result screen to open the "type the code" box when the scanner comes back into view. */
export const scanRequests = { typeCode: false };
