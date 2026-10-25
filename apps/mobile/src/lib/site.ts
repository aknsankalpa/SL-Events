import { Platform } from "react-native";
import { useSyncExternalStore } from "react";
import { createPersistedStore } from "@core/persistedStore";

/**
 * Where the website is. The organizer and admin screens are the website's own mobile view, so the app needs its
 * address. During development that is your computer (a phone can't reach "localhost", so use the computer's address
 * on the same Wi-Fi); after launch it is the real domain. A person can also change it on the "can't reach the
 * website" screen, which is saved on the phone.
 */
export const defaultSiteUrl = (): string =>
  (process.env.EXPO_PUBLIC_WEB_URL ?? (Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000")).replace(/\/+$/, "");

const siteStore = createPersistedStore<{ url: string }>("sl-events:site-url:v1", { url: "" }, (stored) => {
  const url = stored && typeof stored === "object" && "url" in stored && typeof (stored as { url: unknown }).url === "string" ? (stored as { url: string }).url : "";
  return { url: isValidSiteUrl(url) ? url : "" };
});

export function isValidSiteUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function useSiteUrl(): string {
  const saved = useSyncExternalStore(siteStore.subscribe, siteStore.getSnapshot, siteStore.getServerSnapshot);
  return (saved.url || defaultSiteUrl()).replace(/\/+$/, "");
}

/** Saves a new address, or clears it (back to the default) when given an empty string. */
export function setSiteUrl(value: string): boolean {
  const v = value.trim().replace(/\/+$/, "");
  if (v && !isValidSiteUrl(v)) return false;
  siteStore.set({ url: v });
  return true;
}
