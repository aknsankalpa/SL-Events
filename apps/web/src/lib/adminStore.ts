import {
  ADMIN,
  defaultBanner,
  defaultSettings,
  defaultTemplates,
  seedAudit,
  type AdminEventStatus,
  type AdminUser,
  type AppStatus,
  type AuditEntry,
  type AuditType,
  type PlatformSettings,
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

export type Banner = typeof defaultBanner;
export type Maintenance = { on: boolean; window: string; message: string };

export type AdminConfig = {
  settings: PlatformSettings;
  /** Edited email templates by id; anything not edited uses the default. */
  templates: Record<string, { subject: string; body: string }>;
  banner: Banner;
  maintenance: Maintenance;
  /** True once an admin has published the banner; until then the public site shows none. */
  bannerPublished: boolean;
  /** Edited notification texts by id. */
  notifications: Record<string, string>;
  /** Edited FAQ entries by their position in the public list. */
  faq: Record<string, { q: string; a: string }>;
};

const defaultMaintenance: Maintenance = { on: false, window: "Tue, 27 Oct · 2:00–3:00 AM KST", message: "We're updating SL Events. Back by 3:00 AM." };

export const defaultConfig: AdminConfig = { settings: defaultSettings, templates: {}, banner: defaultBanner, maintenance: defaultMaintenance, bannerPublished: false, notifications: {}, faq: {} };

export const configStore = createPersistedStore<AdminConfig>("sl-events:admin-config:v1", defaultConfig, (stored) => {
  const s = isRecord(stored) ? stored : {};
  const settings = isRecord(s.settings) ? (s.settings as Partial<PlatformSettings>) : {};
  return {
    settings: {
      ...defaultSettings,
      ...settings,
      ticketTypes: { ...defaultSettings.ticketTypes, ...(isRecord(settings.ticketTypes) ? settings.ticketTypes : {}) },
      languages: { ...defaultSettings.languages, ...(isRecord(settings.languages) ? settings.languages : {}) },
      categories: Array.isArray(settings.categories) ? settings.categories.filter((c): c is string => typeof c === "string") : defaultSettings.categories,
      colours: Array.isArray(settings.colours) ? settings.colours.filter((c): c is string => typeof c === "string") : defaultSettings.colours,
    },
    templates: isRecord(s.templates) ? (s.templates as AdminConfig["templates"]) : {},
    banner: { ...defaultBanner, ...(isRecord(s.banner) ? s.banner : {}) },
    maintenance: { ...defaultMaintenance, ...(isRecord(s.maintenance) ? s.maintenance : {}) },
    bannerPublished: s.bannerPublished === true,
    notifications: isRecord(s.notifications) ? (s.notifications as AdminConfig["notifications"]) : {},
    faq: isRecord(s.faq) ? (s.faq as AdminConfig["faq"]) : {},
  };
});

export const updateConfig = (change: (c: AdminConfig) => AdminConfig) => configStore.update(change);

export const templateFor = (config: AdminConfig, id: string) => {
  const base = defaultTemplates.find((t) => t.id === id)!;
  return { ...base, ...config.templates[id] };
};

/* ------------------------------------- audit log ------------------------------------- */

export const auditStore = createPersistedStore<AuditEntry[]>("sl-events:admin-audit:v1", seedAudit, (stored) =>
  Array.isArray(stored) ? (stored.filter(isRecord).filter((e) => typeof e.id === "string") as unknown as AuditEntry[]) : seedAudit,
);

/** Records an admin decision. Entries are only ever added: there is no function here to change or remove one. */
export function logAudit(entry: { action: string; item: string; type: AuditType; detail?: AuditEntry["detail"] }) {
  const record: AuditEntry = {
    id: `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    who: ADMIN.name,
    initials: ADMIN.initials,
    role: ADMIN.role,
    action: entry.action,
    item: entry.item,
    type: entry.type,
    detail: { device: "This browser", ...entry.detail },
  };
  auditStore.update((list) => [record, ...list]);
}
