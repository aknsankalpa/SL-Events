import { useEffect, useSyncExternalStore } from "react";
import { defaultConfig, normalizeConfig, paymentAccountOf, type AdminConfig } from "@core/siteConfig";
import { api } from "./api";

/**
 * The website's settings that admins edit (the bank account customers pay into, among others). Asked once when a
 * screen first needs them and again every 10 minutes; until then the defaults are shown.
 */
let config: AdminConfig = defaultConfig;
let loadedAt = 0;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

export function loadSiteConfig(): Promise<void> {
  if (loadedAt && Date.now() - loadedAt < 10 * 60_000) return Promise.resolve();
  loading ??= api<{ config?: unknown }>("/api/site/config")
    .then(({ ok, data }) => {
      if (!ok || !data.config) return;
      config = normalizeConfig(data.config);
      loadedAt = Date.now();
      listeners.forEach((l) => l());
    })
    .finally(() => {
      loading = null;
    });
  return loading;
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export function useSiteConfig(): AdminConfig {
  const value = useSyncExternalStore(subscribe, () => config, () => config);
  useEffect(() => {
    void loadSiteConfig();
  }, []);
  return value;
}

/** The bank account customers transfer to, as the admin set it on the website. */
export const usePaymentAccount = () => paymentAccountOf(useSiteConfig());
