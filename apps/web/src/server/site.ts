// The site-wide configuration in site_settings (one row, key "admin_config"). Server code only.
//
// Everyone reads it (the banner, the maintenance notice and the bank account customers pay into are public); only
// admins change it. Reads are cached and refreshed straight away after a change.

import { eq } from "drizzle-orm";
import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import { db, schema as s } from "@/db";
import { normalizeConfig, type AdminConfig } from "@/lib/siteConfig";
import type { AccountUser } from "./auth";

const KEY = "admin_config";

/** The configuration, with defaults for anything never saved. */
export async function getSiteConfig(): Promise<AdminConfig> {
  "use cache";
  cacheLife("minutes");
  cacheTag("site-config");
  const [row] = await db.select().from(s.siteSettings).where(eq(s.siteSettings.key, KEY));
  return normalizeConfig(row?.value);
}

/** Saves the configuration (admins only; the admin screens record each change in the audit log). */
export async function saveSiteConfig(user: AccountUser & { id: number }, input: unknown): Promise<AdminConfig> {
  const config = normalizeConfig(input);
  // A logo is stored as a small picture; anything larger than ~300 KB is refused rather than stored in the row.
  if (config.settings.logo && config.settings.logo.length > 400_000) config.settings.logo = "";
  await db
    .insert(s.siteSettings)
    .values({ key: KEY, value: config, updatedBy: user.id })
    .onDuplicateKeyUpdate({ set: { value: config, updatedBy: user.id } });
  try {
    revalidateTag("site-config", { expire: 0 });
  } catch {
    /* outside a request */
  }
  return config;
}
