"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useSession } from "@/components/auth/useSession";
import { effectiveStatus, type Booking } from "@/lib/bookings";

/** The current time, refreshed every 30 seconds. It is 0 on the server and before the first tick, so nothing expires early. */
const clock = { now: 0 };
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
    () => 0,
  );

/* ---------- the signed-in customer's bookings, as the server has them ---------- */

type State = { email: string | null; list: Booking[]; loaded: boolean };
const EMPTY: State = { email: null, list: [], loaded: false };
let state: State = EMPTY;
let loading: { email: string; promise: Promise<void> } | null = null;
const listeners = new Set<() => void>();

function set(next: State) {
  state = next;
  listeners.forEach((l) => l());
}

function load(email: string): Promise<void> {
  if (loading?.email === email) return loading.promise;
  const promise = fetch("/api/bookings", { credentials: "same-origin", cache: "no-store" })
    .then(async (res) => {
      const data = (await res.json().catch(() => ({}))) as { bookings?: Booking[] };
      if (res.ok) set({ email, list: data.bookings ?? [], loaded: true });
      else if (state.email !== email) set({ email, list: [], loaded: true });
      else set({ ...state, loaded: true });
    })
    .catch(() => {
      // Offline: keep what is already on screen.
      set(state.email === email ? { ...state, loaded: true } : { email, list: [], loaded: true });
    })
    .finally(() => {
      if (loading?.promise === promise) loading = null;
    });
  loading = { email, promise };
  return promise;
}

/** Asks the server again, for example after staff may have checked a payment. */
export function refreshBookings(): Promise<void> {
  return state.email ? load(state.email) : Promise.resolve();
}

function onFocus() {
  if (document.visibilityState === "visible") void refreshBookings();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    }
  };
}

/** Puts a booking the server just returned into the list, replacing the old copy. */
function remember(b: Booking) {
  if (!state.email || b.ownerEmail !== state.email) return;
  const exists = state.list.some((x) => x.id === b.id);
  set({ ...state, list: exists ? state.list.map((x) => (x.id === b.id ? b : x)) : [b, ...state.list] });
}

/**
 * The signed-in customer's own bookings, with expiry applied. The server only ever returns the customer's own, and
 * `ready` stays false until both the session and the list have arrived.
 */
export function useBookings() {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => state,
    () => EMPTY,
  );
  const { user, ready: sessionReady } = useSession();
  const now = useNow();
  const email = user?.email ?? null;

  useEffect(() => {
    if (email && state.email !== email) void load(email);
    if (!email && sessionReady && state.email) set(EMPTY);
  }, [email, sessionReady]);

  const mine = !!email && snapshot.email === email;
  const bookings = useMemo<Booking[]>(
    () => (mine ? snapshot.list.map((b) => ({ ...b, status: effectiveStatus(b, now) })) : []),
    [mine, snapshot.list, now],
  );
  return { bookings, ready: sessionReady && (!user || (mine && snapshot.loaded)), user };
}

/** One of the customer's bookings by id, or undefined when it doesn't exist or isn't theirs. */
export function useBooking(id: string) {
  const { bookings, ready, user } = useBookings();
  return { booking: bookings.find((b) => b.id === id), ready, user };
}

/* ---------- what a customer can do (the server decides each one) ---------- */

export type ActionResult = { ok: true; booking: Booking } | { ok: false; error: string; errors?: Record<string, string> };
const OFFLINE = "We couldn't reach SL Events. Check your connection and try again.";

async function post(url: string, body?: unknown): Promise<ActionResult> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "same-origin",
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as { booking?: Booking; error?: string; errors?: Record<string, string> };
    if (!res.ok || !data.booking) return { ok: false, error: data.error ?? "Something went wrong. Please try again.", errors: data.errors };
    remember(data.booking);
    return { ok: true, booking: data.booking };
  } catch {
    return { ok: false, error: OFFLINE };
  }
}

export type NewBookingRequest = { eventSlug: string; tickets?: Record<string, number>; seatIds?: string[]; attendees: string[] };

export const bookingActions = {
  /** Places a booking. The server checks what is left, sets the prices and holds seats. */
  create: (req: NewBookingRequest) => post("/api/bookings", req),

  /** Cancels an unpaid booking. */
  cancel: (ref: string) => post(`/api/bookings/${encodeURIComponent(ref)}/cancel`),

  /**
   * Sends the transfer screenshot and details. `onProgress` gets 0–100 while the file uploads (fetch can't report
   * upload progress, so this uses XMLHttpRequest).
   */
  submitProof(ref: string, form: FormData, onProgress?: (percent: number) => void): Promise<ActionResult> {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `/api/bookings/${encodeURIComponent(ref)}/proof`);
      xhr.responseType = "json";
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        const data = (xhr.response ?? {}) as { booking?: Booking; error?: string; errors?: Record<string, string> };
        if (xhr.status >= 200 && xhr.status < 300 && data.booking) {
          remember(data.booking);
          resolve({ ok: true, booking: data.booking });
        } else resolve({ ok: false, error: data.error ?? "Something went wrong. Please try again.", errors: data.errors });
      };
      xhr.onerror = () => resolve({ ok: false, error: OFFLINE });
      xhr.send(form);
    });
  },
};
