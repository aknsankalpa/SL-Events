"use client";

import { useSyncExternalStore } from "react";
import type { SessionUser } from "@/lib/session";

/**
 * Who is signed in on this browser, as the server says (GET /api/auth/me reads the httpOnly session cookie, which the
 * page itself can't). The forms change it only through the actions below, which call the server.
 */
export type Role = "customer" | "organizer" | "staff" | "admin";
export type AccountUser = SessionUser & { roles: Role[] };

type State = { user: AccountUser | null; ready: boolean };
const SERVER: State = { user: null, ready: false };
let state: State = SERVER;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function set(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

async function call<T>(url: string, init?: { method?: string; body?: unknown }): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(url, {
    method: init?.method ?? (init?.body ? "POST" : "GET"),
    headers: init?.body ? { "content-type": "application/json" } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
    credentials: "same-origin",
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}

/** Asks the server who is signed in. Runs once when the first component needs it; actions refresh it as they go. */
export function refreshSession(): Promise<void> {
  loading ??= call<{ user: AccountUser | null }>("/api/auth/me")
    .then(({ data }) => set({ user: data.user ?? null, ready: true }))
    .catch(() => set({ ready: true }))
    .finally(() => {
      loading = null;
    });
  return loading;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!state.ready && !loading) void refreshSession();
  return () => listeners.delete(listener);
}

/**
 * The signed-in account, or null for a visitor. `ready` turns true once the server has answered, so a page can wait
 * before choosing between the public and customer views instead of flashing the wrong one.
 */
export function useSession(): State {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER,
  );
}

type Fail = { ok: false; error?: string; errors?: Record<string, string> };
type Done<T = object> = ({ ok: true } & T) | Fail;
const failed = (data: { error?: string; errors?: Record<string, string> }, fallback: string): Fail => ({
  ok: false,
  error: data.error ?? (data.errors ? undefined : fallback),
  errors: data.errors,
});
const OFFLINE = "We couldn't reach SL Events. Check your connection and try again.";

/** Everything the account screens can do. Each one is decided by the server. */
export const auth = {
  async login(email: string, password: string): Promise<Done<{ user: AccountUser }>> {
    try {
      const { ok, data } = await call<{ user: AccountUser; error?: string }>("/api/auth/login", { body: { email, password } });
      if (!ok) return failed(data, "Couldn't log in.");
      set({ user: data.user, ready: true });
      return { ok: true, user: data.user };
    } catch {
      return { ok: false, error: OFFLINE };
    }
  },

  async register(name: string, email: string, password: string): Promise<Done<{ user: AccountUser; devCode?: string }>> {
    try {
      const { ok, data } = await call<{ user: AccountUser; devCode?: string; errors?: Record<string, string> }>("/api/auth/register", { body: { name, email, password } });
      if (!ok) return failed(data, "Couldn't create the account.");
      set({ user: data.user, ready: true });
      return { ok: true, user: data.user, devCode: data.devCode };
    } catch {
      return { ok: false, error: OFFLINE };
    }
  },

  async verifyEmail(email: string, code: string): Promise<Done<{ user: AccountUser }>> {
    try {
      const { ok, data } = await call<{ user: AccountUser; error?: string }>("/api/auth/verify-email", { body: { email, code } });
      if (!ok) return failed(data, "Couldn't check the code.");
      set({ user: data.user, ready: true });
      return { ok: true, user: data.user };
    } catch {
      return { ok: false, error: OFFLINE };
    }
  },

  async resendCode(email: string): Promise<Done<{ devCode?: string }>> {
    try {
      const { ok, data } = await call<{ devCode?: string; error?: string }>("/api/auth/resend-code", { body: { email } });
      return ok ? { ok: true, devCode: data.devCode } : failed(data, "Couldn't send a new code.");
    } catch {
      return { ok: false, error: OFFLINE };
    }
  },

  async forgotPassword(email: string): Promise<Done<{ devCode?: string }>> {
    try {
      const { ok, data } = await call<{ devCode?: string; error?: string }>("/api/auth/forgot-password", { body: { email } });
      return ok ? { ok: true, devCode: data.devCode } : failed(data, "Couldn't send the code.");
    } catch {
      return { ok: false, error: OFFLINE };
    }
  },

  async resetPassword(email: string, code: string, password: string): Promise<Done> {
    try {
      const { ok, data } = await call<{ errors?: Record<string, string>; error?: string }>("/api/auth/reset-password", { body: { email, code, password } });
      return ok ? { ok: true } : failed(data, "Couldn't change the password.");
    } catch {
      return { ok: false, error: OFFLINE };
    }
  },

  async updateName(name: string): Promise<Done<{ user: AccountUser }>> {
    try {
      const { ok, data } = await call<{ user: AccountUser; errors?: Record<string, string> }>("/api/auth/account", { method: "PATCH", body: { name } });
      if (!ok) return failed(data, "Couldn't save your name.");
      set({ user: data.user });
      return { ok: true, user: data.user };
    } catch {
      return { ok: false, error: OFFLINE };
    }
  },

  async deleteAccount(): Promise<Done> {
    try {
      const { ok, data } = await call<{ error?: string }>("/api/auth/account", { method: "DELETE" });
      if (!ok) return failed(data, "Couldn't close the account.");
      set({ user: null, ready: true });
      return { ok: true };
    } catch {
      return { ok: false, error: OFFLINE };
    }
  },

  async logout(): Promise<void> {
    set({ user: null, ready: true });
    await call("/api/auth/logout", { body: {} }).catch(() => undefined);
  },
};

/** The code shown on screen while developing, because emails aren't sent yet. Kept for the verify and reset pages. */
export const devCodes = {
  save(code?: string) {
    try {
      if (code) sessionStorage.setItem("sl-events:dev-code", code);
    } catch {
      /* storage blocked */
    }
  },
  read(): string | null {
    try {
      return sessionStorage.getItem("sl-events:dev-code");
    } catch {
      return null;
    }
  },
};
