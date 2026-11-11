import { defaultBanner, defaultSettings, defaultTemplates, type PlatformSettings } from "./admin";

/**
 * The site-wide configuration admins edit: platform settings, the announcement banner, the maintenance notice, email
 * and notification texts and FAQ edits. Stored once on the server (site_settings) and read by the public site and
 * the admin portal. Plain data and pure functions only, so both sides can import it.
 */

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

const defaultMaintenance: Maintenance = { on: false, window: "", message: "We're updating SL Events. We'll be back shortly." };

export const defaultConfig: AdminConfig = { settings: defaultSettings, templates: {}, banner: defaultBanner, maintenance: defaultMaintenance, bannerPublished: false, notifications: {}, faq: {} };

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** Any stored value, made into a complete configuration (missing parts take the defaults). */
export function normalizeConfig(stored: unknown): AdminConfig {
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
}

export const templateFor = (config: AdminConfig, id: string) => {
  const base = defaultTemplates.find((t) => t.id === id)!;
  return { ...base, ...config.templates[id] };
};

/** The bank account customers pay into, as the admin set it. */
export const paymentAccountOf = (config: AdminConfig) => ({
  bank: config.settings.accountBank,
  number: config.settings.accountNumber,
  holder: config.settings.accountHolder,
});
