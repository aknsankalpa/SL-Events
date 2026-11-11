import { useEffect, useMemo, useSyncExternalStore } from "react";
import { effectiveStatus, type Booking } from "@core/bookings";
import { useAccount } from "./account";
import { api, appendFile, OFFLINE, type PickedFile } from "./api";

/**
 * The signed-in customer's bookings, as the website has them. The website only ever returns the customer's own, checks
 * what is left when a booking is placed, holds seats, and decides every change; the app shows what it answers.
 */
type State = { email: string | null; list: Booking[]; loaded: boolean };
const EMPTY: State = { email: null, list: [], loaded: false };
let state: State = EMPTY;
const listeners = new Set<() => void>();
const set = (next: State) => {
  state = next;
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

/** Loads the bookings of the signed-in account (again). */
export function loadBookings(email: string): Promise<void> {
  loading ??= api<{ bookings: Booking[] }>("/api/bookings")
    .then(({ ok, data }) => {
      if (ok) set({ email, list: data.bookings ?? [], loaded: true });
      else set(state.email === email ? { ...state, loaded: true } : { email, list: [], loaded: true });
    })
    .finally(() => {
      loading = null;
    });
  return loading;
}

function remember(b: Booking) {
  if (!state.email) return;
  const exists = state.list.some((x) => x.id === b.id);
  set({ ...state, list: exists ? state.list.map((x) => (x.id === b.id ? b : x)) : [b, ...state.list] });
}

/** The current time, refreshed every 30 seconds, so unpaid bookings expire on screen without a reload. */
const clock = { now: Date.now() };
const clockSubscribe = (listener: () => void) => {
  clock.now = Date.now();
  const id = setInterval(() => {
    clock.now = Date.now();
    listener();
  }, 30_000);
  return () => clearInterval(id);
};
export const useNow = () =>
  useSyncExternalStore(
    clockSubscribe,
    () => clock.now,
    () => clock.now,
  );

/** The signed-in customer's own bookings, with expiry applied, newest first. `loaded` is false until they arrive. */
export function useBookingList() {
  const s = useSyncExternalStore(subscribe, snapshot, snapshot);
  const { user } = useAccount();
  const now = useNow();
  const email = user?.email ?? null;
  useEffect(() => {
    if (email && state.email !== email) void loadBookings(email);
    if (!email && state.email) set(EMPTY);
  }, [email]);
  const mine = !!email && s.email === email;
  const bookings = useMemo(() => (mine ? s.list.map((b) => ({ ...b, status: effectiveStatus(b, now) })) : []), [mine, s.list, now]);
  return { bookings, loaded: !email || (mine && s.loaded) };
}

export type ActionResult = { ok: true; booking: Booking } | { ok: false; error: string; errors?: Record<string, string> };

async function send(path: string, body?: unknown): Promise<ActionResult> {
  const { ok, data } = await api<{ booking?: Booking }>(path, { body: body ?? {} });
  if (!ok || !data.booking) return { ok: false, error: data.error ?? OFFLINE, errors: data.errors };
  remember(data.booking);
  return { ok: true, booking: data.booking };
}


export const bookingActions = {
  /** Places a booking. The website checks what is left, sets the prices and holds seats. */
  create: (req: { eventSlug: string; tickets?: Record<string, number>; seatIds?: string[]; attendees: string[] }) => send("/api/bookings", req),

  /** Cancels an unpaid booking. */
  cancel: (ref: string) => send(`/api/bookings/${encodeURIComponent(ref)}/cancel`),

  /** Sends the transfer screenshot; the booking moves to "under review" and is marked paid only by staff. */
  async submitProof(ref: string, file: PickedFile, details: { sender: string; bank: string; amount?: string; note?: string }): Promise<ActionResult> {
    const form = new FormData();
    try {
      await appendFile(form, "file", file);
    } catch {
      return { ok: false, error: "That picture couldn't be read. Try choosing it again." };
    }
    for (const [k, v] of Object.entries(details)) if (v) form.append(k, v);
    const { ok, data } = await api<{ booking?: Booking }>(`/api/bookings/${encodeURIComponent(ref)}/proof`, { body: form });
    if (!ok || !data.booking) return { ok: false, error: data.error ?? OFFLINE, errors: data.errors };
    remember(data.booking);
    return { ok: true, booking: data.booking };
  },
};
