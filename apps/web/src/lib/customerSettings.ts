import { createPersistedStore } from "./persistedStore";

/** A customer's own preferences, kept per account in this browser until the API exists. */
export type CustomerSettings = {
  phone: string;
  city: string;
  language: string;
  notifications: { email: boolean; browser: boolean; reminders: boolean; city: boolean; announcements: boolean; offers: boolean };
  privacy: { marketing: boolean; analytics: boolean };
  passwordChangedAt?: string;
};

export const defaultSettings: CustomerSettings = {
  phone: "",
  city: "",
  language: "English",
  notifications: { email: true, browser: true, reminders: true, city: true, announcements: true, offers: false },
  privacy: { marketing: false, analytics: true },
};

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

function merge(stored: unknown): CustomerSettings {
  const s = isRecord(stored) ? stored : {};
  const bools = <T extends Record<string, boolean>>(base: T, v: unknown): T => {
    const out = { ...base };
    if (isRecord(v)) for (const k of Object.keys(base)) if (typeof v[k] === "boolean") (out as Record<string, boolean>)[k] = v[k] as boolean;
    return out;
  };
  return {
    phone: typeof s.phone === "string" ? s.phone : "",
    city: typeof s.city === "string" ? s.city : "",
    language: typeof s.language === "string" && s.language ? s.language : defaultSettings.language,
    notifications: bools(defaultSettings.notifications, s.notifications),
    privacy: bools(defaultSettings.privacy, s.privacy),
    passwordChangedAt: typeof s.passwordChangedAt === "string" ? s.passwordChangedAt : undefined,
  };
}

export const settingsStore = createPersistedStore<Record<string, CustomerSettings>>("sl-events:customer-settings:v1", {}, (stored) =>
  isRecord(stored) ? Object.fromEntries(Object.entries(stored).map(([email, v]) => [email, merge(v)])) : {},
);

export const settingsFor = (all: Record<string, CustomerSettings>, email: string): CustomerSettings => all[email] ?? defaultSettings;

export function updateSettings(email: string, change: (s: CustomerSettings) => CustomerSettings) {
  settingsStore.update((all) => ({ ...all, [email]: change(settingsFor(all, email)) }));
}
