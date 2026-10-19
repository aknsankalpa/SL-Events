import { createPersistedStore } from "./persistedStore";

/**
 * Who is signed in, kept in this browser until the real auth API exists (Supabase later). A visitor with no session
 * sees the public website; a signed-in person gets the customer interface (tickets, bookings, profile).
 * Passwords are never stored here: the mock accepts any valid sign-in.
 */
export type SessionUser = {
  email: string;
  name: string;
  firstName: string;
  initials: string;
  /** False until the 6-digit code from the verification email has been entered. */
  verified: boolean;
};

type Session = { user: SessionUser | null };
type Account = { email: string; name: string; verified: boolean };

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown) => (typeof v === "string" ? v : "");

export function makeUser(name: string, email: string, verified: boolean): SessionUser {
  const clean = name.trim() || email.split("@")[0]!.replace(/[._-]+/g, " ");
  const words = clean.split(/\s+/).filter(Boolean).map((w) => w[0]!.toUpperCase() + w.slice(1));
  return {
    email: email.trim().toLowerCase(),
    name: words.join(" "),
    firstName: words[0] ?? "there",
    initials: words.slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?",
    verified,
  };
}

const sessionStore = createPersistedStore<Session>("sl-events:session:v1", { user: null }, (stored) => {
  const u = isRecord(stored) && isRecord(stored.user) ? stored.user : null;
  if (!u || !str(u.email)) return { user: null };
  return { user: makeUser(str(u.name), str(u.email), u.verified !== false) };
});

const accountsStore = createPersistedStore<Account[]>("sl-events:accounts:v1", [], (stored) =>
  Array.isArray(stored)
    ? stored
        .filter(isRecord)
        .filter((a) => str(a.email))
        .map((a) => ({ email: str(a.email).toLowerCase(), name: str(a.name), verified: a.verified !== false }))
    : [],
);

export const sessionSubscribe = sessionStore.subscribe;
export const sessionSnapshot = () => sessionStore.getSnapshot().user;
export const sessionServerSnapshot = () => sessionStore.getServerSnapshot().user;

const norm = (email: string) => email.trim().toLowerCase();

/** The demo customer the mock bookings and tickets belong to. */
const DEMO = { email: "kasun@example.com", name: "Kasun Perera" };

/** Signs in with an email. A registered account keeps its name; anyone else is signed in under a name made from the email. */
export function signIn(email: string): SessionUser {
  const known = accountsStore.getSnapshot().find((a) => a.email === norm(email));
  const name = known?.name ?? (norm(email) === DEMO.email ? DEMO.name : "");
  const user = makeUser(name, email, known ? known.verified : true);
  sessionStore.set({ user });
  return user;
}

/** Creates an account that still has to verify its email. It does not sign in until then. */
export function registerAccount(name: string, email: string) {
  const rest = accountsStore.getSnapshot().filter((a) => a.email !== norm(email));
  accountsStore.set([...rest, { email: norm(email), name: name.trim(), verified: false }]);
}

export function markVerified(email: string): SessionUser {
  accountsStore.update((list) => list.map((a) => (a.email === norm(email) ? { ...a, verified: true } : a)));
  const known = accountsStore.getSnapshot().find((a) => a.email === norm(email));
  const user = makeUser(known?.name ?? "", email, true);
  sessionStore.set({ user });
  return user;
}

export function accountExists(email: string) {
  return accountsStore.getSnapshot().some((a) => a.email === norm(email));
}

/** Changes the name on the account. The email can't be edited here: it identifies the account and its bookings. */
export function updateProfile(patch: { name: string }): SessionUser | null {
  const cur = sessionStore.getSnapshot().user;
  if (!cur) return null;
  const user = makeUser(patch.name, cur.email, cur.verified);
  sessionStore.set({ user });
  accountsStore.update((list) => [...list.filter((a) => a.email !== cur.email), { email: cur.email, name: user.name, verified: user.verified }]);
  return user;
}

/** Closes the account and signs out. Payment records are kept by the server for the period the law requires. */
export function deleteAccount(email: string) {
  accountsStore.update((list) => list.filter((a) => a.email !== norm(email)));
  sessionStore.set({ user: null });
}

export function signOut() {
  sessionStore.set({ user: null });
}

/** Only follow same-site paths after sign-in, so a crafted link can't send people elsewhere. */
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
