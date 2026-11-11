import { useSyncExternalStore } from "react";
import type { SessionUser } from "@core/session";
import { api, currentToken, setToken } from "./api";

/**
 * The signed-in account, as the website knows it (name, email, whether the email is confirmed, and its roles). The
 * phone keeps only the sign-in token; everything else comes from the website when the app starts.
 */
export type ServerRole = "customer" | "organizer" | "staff" | "admin";
export type Account = SessionUser & { roles: ServerRole[] };

type State = { user: Account | null; ready: boolean };
let state: State = { user: null, ready: false };
const listeners = new Set<() => void>();
const set = (next: Partial<State>) => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
};

export const accountSubscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
export const accountSnapshot = () => state;

export function useAccount(): State {
  return useSyncExternalStore(accountSubscribe, accountSnapshot, accountSnapshot);
}

/** Asks the website who is signed in on this phone (at start-up, and after anything that changes the account). */
export async function refreshAccount(): Promise<Account | null> {
  if (!currentToken()) {
    set({ user: null, ready: true });
    return null;
  }
  const { ok, status, data } = await api<{ user: Account | null }>("/api/auth/me");
  if (ok) {
    if (!data.user) setToken("");
    set({ user: data.user ?? null, ready: true });
  } else if (status === 0) {
    // Offline: keep whoever was signed in until the website can be asked again.
    set({ ready: true });
  } else {
    setToken("");
    set({ user: null, ready: true });
  }
  return state.user;
}

type Fail = { ok: false; error?: string; errors?: Record<string, string> };
type Done<T = object> = ({ ok: true } & T) | Fail;
const failed = (data: { error?: string; errors?: Record<string, string> }, fallback: string): Fail => ({
  ok: false,
  error: data.error ?? (data.errors ? undefined : fallback),
  errors: data.errors,
});

/** Everything the account screens can do. Each one is decided by the website. */
export const account = {
  async login(email: string, password: string): Promise<Done<{ user: Account }>> {
    const { ok, data } = await api<{ user: Account; token?: string }>("/api/auth/login", { body: { email, password } });
    if (!ok || !data.token) return failed(data, "Couldn't log in.");
    setToken(data.token);
    set({ user: data.user, ready: true });
    return { ok: true, user: data.user };
  },

  async register(name: string, email: string, password: string): Promise<Done<{ user: Account; devCode?: string }>> {
    const { ok, data } = await api<{ user: Account; token?: string; devCode?: string }>("/api/auth/register", { body: { name, email, password } });
    if (!ok) return failed(data, "Couldn't create the account.");
    if (data.token) setToken(data.token);
    set({ user: data.user, ready: true });
    return { ok: true, user: data.user, devCode: data.devCode };
  },

  async verifyEmail(email: string, code: string): Promise<Done<{ user: Account }>> {
    const { ok, data } = await api<{ user: Account; token?: string }>("/api/auth/verify-email", { body: { email, code } });
    if (!ok) return failed(data, "Couldn't check the code.");
    if (data.token) setToken(data.token);
    set({ user: data.user, ready: true });
    return { ok: true, user: data.user };
  },

  async resendCode(email: string): Promise<Done<{ devCode?: string }>> {
    const { ok, data } = await api<{ devCode?: string }>("/api/auth/resend-code", { body: { email } });
    return ok ? { ok: true, devCode: data.devCode } : failed(data, "Couldn't send a new code.");
  },

  async forgotPassword(email: string): Promise<Done<{ devCode?: string }>> {
    const { ok, data } = await api<{ devCode?: string }>("/api/auth/forgot-password", { body: { email } });
    return ok ? { ok: true, devCode: data.devCode } : failed(data, "Couldn't send the code.");
  },

  async resetPassword(email: string, code: string, password: string): Promise<Done> {
    const { ok, data } = await api("/api/auth/reset-password", { body: { email, code, password } });
    return ok ? { ok: true } : failed(data, "Couldn't change the password.");
  },

  async updateName(name: string): Promise<Done<{ user: Account }>> {
    const { ok, data } = await api<{ user: Account }>("/api/auth/account", { method: "PATCH", body: { name } });
    if (!ok) return failed(data, "Couldn't save your name.");
    set({ user: data.user });
    return { ok: true, user: data.user };
  },

  async deleteAccount(): Promise<Done> {
    const { ok, data } = await api("/api/auth/account", { method: "DELETE" });
    if (!ok) return failed(data, "Couldn't close the account.");
    setToken("");
    set({ user: null, ready: true });
    return { ok: true };
  },

  async logout(): Promise<void> {
    await api("/api/auth/logout", { body: {} });
    setToken("");
    set({ user: null, ready: true });
  },
};
