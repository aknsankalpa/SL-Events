"use client";

import { useMemo, useSyncExternalStore } from "react";
import { configStore } from "@/lib/adminStore";
import { faqs } from "@/lib/content";

/** The FAQ as customers see it: the standard questions with the admins' edits applied. */
export function useFaqs() {
  const config = useSyncExternalStore(configStore.subscribe, configStore.getSnapshot, configStore.getServerSnapshot);
  return useMemo(() => faqs.map((f, i) => ({ ...f, ...(config.faq[String(i)] ?? {}) })), [config.faq]);
}
