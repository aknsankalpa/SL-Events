"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { OrganizerProfile } from "@/lib/profile";

/**
 * The signed-in organizer's profile, from the server: their own details and their organization's (name, logo,
 * contact, payout account). Shared by the profile page, the sidebar and the event wizard.
 */
let profile: OrganizerProfile | null = null;
const listeners = new Set<() => void>();
let loading: Promise<void> | null = null;

function load(): Promise<void> {
  loading ??= fetch("/api/organizer/profile", { credentials: "same-origin", cache: "no-store" })
    .then(async (res) => {
      const data = (await res.json().catch(() => ({}))) as { profile?: OrganizerProfile };
      if (res.ok && data.profile) profile = data.profile;
    })
    .catch(() => undefined)
    .finally(() => {
      loading = null;
      listeners.forEach((l) => l());
    });
  return loading;
}

export function useOrganizerProfile() {
  const current = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => profile,
    () => null,
  );
  useEffect(() => {
    if (!profile) void load();
  }, []);

  const saveProfile = useCallback(async (next: OrganizerProfile): Promise<{ ok: true } | { ok: false; error: string }> => {
    try {
      const res = await fetch("/api/organizer/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profile: next }),
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as { profile?: OrganizerProfile; error?: string };
      if (!res.ok || !data.profile) return { ok: false, error: data.error ?? "Couldn't save your profile." };
      profile = data.profile;
      listeners.forEach((l) => l());
      return { ok: true };
    } catch {
      return { ok: false, error: "We couldn't reach SL Events." };
    }
  }, []);

  return { profile: current, saveProfile };
}
