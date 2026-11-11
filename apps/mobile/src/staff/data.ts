import { useEffect, useSyncExternalStore } from "react";
import type { CategoryId } from "@core/data";
import { useAccount } from "@/lib/account";
import { api } from "@/lib/api";

const useAccountUser = () => useAccount().user;

/**
 * Door staff: who they are, the events they check tickets in for and each event's numbers, from the website
 * (GET /api/staff/me). The website decides whether a ticket is valid and marks it used (POST /api/staff/checkin), so
 * two phones can never let the same ticket in.
 */

export type StaffEvent = {
  id: string;
  /** The public event this is. */
  slug: string;
  title: string;
  category: CategoryId;
  icon: "mic" | "headset-outline" | "color-palette-outline" | "calendar-outline";
  dateLabel: string;
  doorsLabel: string;
  venue: string;
  /** The door this staff member is posted at. */
  gate: string;
  gates: string[];
  phase: "today" | "upcoming" | "past";
  inLabel?: string;
  expected: number;
  doorsOpened: string;
  /** Entry numbers so far, from every phone at the door. */
  base: {
    checkedIn: number;
    rejected: number;
    perMinute: number;
    byType: { label: string; in: number; of: number }[];
    byGate: { label: string; staff: string; in: number }[];
  };
  /** The latest scans at this event, newest first, from every phone. */
  recent: { id: string; time: string; name: string; ticket: string; gate: string; outcome: Outcome }[];
};

export type StaffProfile = {
  email: string;
  name: string;
  firstName: string;
  initials: string;
  /** The organizer they work for. */
  organizer: string;
  roleLabel: string;
  /** Who to call from the offline and refusal screens. */
  organizerContact: { name: string; phone: string };
  /** Events they check tickets in for (ids). */
  events: string[];
};

type State = { email: string | null; profile: StaffProfile | null; events: StaffEvent[]; loaded: boolean; error?: string };
let state: State = { email: null, profile: null, events: [], loaded: false };
const listeners = new Set<() => void>();
const set = (next: Partial<State>) => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const snapshot = () => state;

let loading: Promise<void> | null = null;

/** Loads (again) the staff member's profile, events and numbers. */
export function loadStaff(email: string): Promise<void> {
  loading ??= api<{ profile: StaffProfile; events: StaffEvent[] }>("/api/staff/me")
    .then(({ ok, status, data }) => {
      if (ok) set({ email, profile: data.profile, events: data.events ?? [], loaded: true, error: undefined });
      else if (status === 403) set({ email, profile: null, events: [], loaded: true, error: data.error });
      else set({ loaded: true, error: data.error });
    })
    .finally(() => {
      loading = null;
    });
  return loading;
}

/** Forgets the staff data (signing out). */
export const clearStaff = () => set({ email: null, profile: null, events: [], loaded: false, error: undefined });

/**
 * The signed-in person's door-staff profile and events. Loads when first used and every 30 seconds while a staff
 * screen is open, so the numbers keep up with every phone at the door.
 */
export function useStaffHome(email: string | null | undefined) {
  const s = useSyncExternalStore(subscribe, snapshot, snapshot);
  useEffect(() => {
    if (!email) return;
    if (state.email !== email) {
      set({ email, profile: null, events: [], loaded: false });
      void loadStaff(email);
    }
    const id = setInterval(() => void loadStaff(email), 30_000);
    return () => clearInterval(id);
  }, [email]);
  const mine = !!email && s.email === email;
  return { profile: mine ? s.profile : null, events: mine ? s.events : [], loaded: mine && s.loaded, error: mine ? s.error : undefined };
}

/** One of the loaded events by id. */
export const staffEvent = (id: string) => state.events.find((e) => e.id === id);
export const staffEvents = () => state.events;

/* ------------------------------------- tickets ------------------------------------- */

/** Where each kind of ticket usually enters and where it sits: shown as a hint on the result screen. */
export const ticketRules: Record<string, { gate: string | null; area: string; allowedAt: string }> = {
  VIP: { gate: "VIP entrance", area: "Front seats", allowedAt: "VIP entrance" },
  General: { gate: null, area: "Standing", allowedAt: "Any door" },
  Student: { gate: null, area: "Standing", allowedAt: "Any door" },
};
export const ruleFor = (ticket: string) => ticketRules[ticket] ?? { gate: null, area: "—", allowedAt: "Any door" };

export type Outcome = "admit" | "already_used" | "invalid" | "wrong_entrance" | "wrong_event" | "not_paid" | "cancelled" | "too_early" | "too_late";

export const outcomeMeta: Record<Outcome, { short: string; refused: boolean }> = {
  admit: { short: "Admit", refused: false },
  already_used: { short: "Used", refused: true },
  invalid: { short: "Invalid", refused: true },
  wrong_entrance: { short: "Wrong door", refused: true },
  wrong_event: { short: "Wrong event", refused: true },
  not_paid: { short: "Not paid", refused: true },
  cancelled: { short: "Cancelled", refused: true },
  too_early: { short: "Too early", refused: true },
  too_late: { short: "Too late", refused: true },
};

/** The signed-in person's door-staff profile (null while loading, or if they aren't door staff). */
export function useStaffProfile(): StaffProfile | null {
  const user = useAccountUser();
  return useStaffHome(user?.email).profile;
}
