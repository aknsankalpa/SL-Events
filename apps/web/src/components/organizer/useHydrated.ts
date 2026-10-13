"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => undefined;

/** False during the server render and the hydrating render, true afterwards. Lets a form wait for stored data. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
