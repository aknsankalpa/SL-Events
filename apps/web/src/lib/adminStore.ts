import { defaultConfig, normalizeConfig, type AdminConfig } from "./siteConfig";
import {
  type AdminEventStatus,
  type AdminUser,
  type AppStatus,
  type AuditEntry,
  type AuditType,
  type Permissions,
  type Role,
} from "./admin";
import { createPersistedStore } from "./persistedStore";

/**
 * What the admin portal changes, kept in this browser until the API exists. Everything an admin decides is also
 * written to the audit log, which has no edit or delete: the real log must be append-only on the server.
 */

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/* ------------------------------ decisions and overrides ------------------------------ */

export type AdminState = {
  appStatus: Record<string, { status: AppStatus; reason?: string }>;
  eventStatus: Record<string, AdminEventStatus>;
  eventTitles: Record<string, string>;
  reportsDismissed: Record<string, boolean>;
  bankDone: Record<string, "confirmed" | "decided">;
  users: Record<string, { role?: Role; active?: boolean; permissions?: Permissions }>;
  invited: AdminUser[];
};

const emptyState: AdminState = { appStatus: {}, eventStatus: {}, eventTitles: {}, reportsDismissed: {}, bankDone: {}, users: {}, invited: [] };

export const adminStore = createPersistedStore<AdminState>("sl-events:admin-state:v1", emptyState, (stored) => {
  const s = isRecord(stored) ? stored : {};
  const obj = (v: unknown) => (isRecord(v) ? (v as Record<string, never>) : {});
  return {
    appStatus: obj(s.appStatus),
    eventStatus: obj(s.eventStatus),
    eventTitles: obj(s.eventTitles),
    reportsDismissed: obj(s.reportsDismissed),
    bankDone: obj(s.bankDone),
    users: obj(s.users),
    invited: Array.isArray(s.invited) ? (s.invited.filter(isRecord) as unknown as AdminUser[]) : [],
  };
});

export const updateAdmin = (change: (s: AdminState) => AdminState) => adminStore.update(change);

/* ------------------------------------ configuration ------------------------------------ */

export { defaultConfig, templateFor, type AdminConfig, type Banner, type Maintenance } from "./siteConfig";

type ConfigState = { config: AdminConfig; loaded: boolean };
let configState: ConfigState = { config: defaultConfig, loaded: false };
const SERVER_CONFIG: ConfigState = { config: defaultConfig, loaded: false };
const configListeners = new Set<() => void>();
let configLoading: Promise<void> | null = null;
/** Called with the reason when the server refuses a change (the screen then shows what is really saved). */
export const configErrors = new Set<(message: string) => void>();

function setConfig(next: ConfigState) {
  configState = next;
  configListeners.forEach((l) => l());
}

/** Loads the site configuration from the server (once, unless asked again). */
export function loadConfig(force = false): Promise<void> {
  if (configState.loaded && !force) return Promise.resolve();
  configLoading ??= fetch("/api/site/config", { cache: "no-store" })
    .then(async (res) => {
      const data = (await res.json().catch(() => ({}))) as { config?: unknown };
      if (res.ok) setConfig({ config: normalizeConfig(data.config), loaded: true });
    })
    .catch(() => undefined)
    .finally(() => {
      configLoading = null;
    });
  return configLoading;
}

/**
 * The site configuration as the server has it. Works with useSyncExternalStore; subscribing starts the first load, so
 * the public banner and notices appear for every visitor once an admin publishes them.
 */
export const configStore = {
  subscribe(listener: () => void) {
    configListeners.add(listener);
    void loadConfig();
    return () => configListeners.delete(listener);
  },
  getSnapshot: () => configState.config,
  getServerSnapshot: () => SERVER_CONFIG.config,
};

/**
 * Changes the configuration. The screen updates straight away and the server saves it (admins only, recorded in the
 * audit log); if the server refuses, the saved version comes back and the reason goes to `configErrors`.
 */
export function updateConfig(change: (c: AdminConfig) => AdminConfig) {
  const next = change(configState.config);
  setConfig({ config: next, loaded: true });
  void fetch("/api/admin/site-config", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ config: next }),
    credentials: "same-origin",
  })
    .then(async (res) => {
      if (res.ok) return;
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      configErrors.forEach((l) => l(data.error ?? "Couldn't save. Your change wasn't kept."));
      await loadConfig(true);
    })
    .catch(async () => {
      configErrors.forEach((l) => l("We couldn't reach SL Events. Your change wasn't saved."));
      await loadConfig(true);
    });
}

/* ------------------------------------- audit log ------------------------------------- */

/** Called after an entry is written, so an open audit page loads the log again. */
export const auditWritten = new Set<() => void>();

/**
 * Records an admin action in the audit log on the server, in the signed-in admin's name. Entries are only ever added:
 * nothing can change or remove one. (Decisions the server carries out, such as publishing an event, are recorded by
 * the server itself.)
 */
export function logAudit(entry: { action: string; item: string; type: AuditType; detail?: AuditEntry["detail"] }) {
  void fetch("/api/admin/audit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: entry.type, action: entry.action, item: entry.item, changes: entry.detail?.changes }),
    credentials: "same-origin",
  })
    .then(() => auditWritten.forEach((l) => l()))
    .catch(() => undefined);
}
