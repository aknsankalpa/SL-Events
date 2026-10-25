import { useSyncExternalStore } from "react";
import { createPersistedStore } from "@core/persistedStore";
import { homeForRole, rolesFor, type Role } from "./roles";

/**
 * Which of an account's roles it is using right now. An organizer who also books tickets can switch between the
 * organizer area and the customer app. The choice is remembered per account on this phone.
 */
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

export const viewStore = createPersistedStore<Record<string, Role>>("sl-events:mobile-view:v1", {}, (stored) => {
  if (!isRecord(stored)) return {};
  const out: Record<string, Role> = {};
  for (const [email, role] of Object.entries(stored)) if (typeof role === "string") out[email] = role as Role;
  return out;
});

const key = (email?: string | null) => (email ?? "").trim().toLowerCase();

/** The role in use: the remembered one if the account still holds it, otherwise its first role. */
export function currentView(email?: string | null): Role {
  const roles = rolesFor(email);
  const chosen = viewStore.getSnapshot()[key(email)];
  return chosen && roles.includes(chosen) ? chosen : roles[0]!;
}

export function useView(email?: string | null): Role {
  const all = useSyncExternalStore(viewStore.subscribe, viewStore.getSnapshot, viewStore.getServerSnapshot);
  const roles = rolesFor(email);
  const chosen = all[key(email)];
  return chosen && roles.includes(chosen) ? chosen : roles[0]!;
}

export function setView(email: string, role: Role) {
  if (rolesFor(email).includes(role)) viewStore.update((all) => ({ ...all, [key(email)]: role }));
}

/** Where an account lands after signing in. */
export const homeFor = (email?: string | null) => homeForRole(currentView(email));
