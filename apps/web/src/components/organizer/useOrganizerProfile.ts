"use client";

import { useSyncExternalStore } from "react";
import { profileStore, type OrganizerProfile } from "@/lib/profile";

export function useOrganizerProfile() {
  const profile = useSyncExternalStore(profileStore.subscribe, profileStore.getSnapshot, profileStore.getServerSnapshot);
  return {
    profile,
    saveProfile: (next: OrganizerProfile) => profileStore.set(next),
  };
}
