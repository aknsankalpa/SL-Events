import { seedOps, type EventOps } from "./operations";

/**
 * Event-day staff, settings and activity per event, kept in localStorage until the API exists.
 * Exposed as a tiny external store so components read it with useSyncExternalStore (no setState in effects,
 * no hydration mismatch). A stored value always wins over the seed.
 */
const KEY = "sl-events:event-operations:v1";
const EMPTY: Record<string, EventOps> = {};

let cache: Record<string, EventOps> | null = null;
const listeners = new Set<() => void>();

function read(): Record<string, EventOps> {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, EventOps>) : {};
  } catch {
    return {};
  }
}

function commit(next: Record<string, EventOps>) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: the in-memory copy still serves this session */
  }
  listeners.forEach((l) => l());
}

export function getSnapshot(): Record<string, EventOps> {
  if (cache === null) cache = read();
  return cache;
}

export function getServerSnapshot(): Record<string, EventOps> {
  return EMPTY;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** The operations record for an event: whatever was saved, otherwise the seed for that event. */
export function opsFor(all: Record<string, EventOps>, eventId: string): EventOps {
  return all[eventId] ?? seedOps(eventId);
}

export function saveOps(eventId: string, next: EventOps) {
  commit({ ...getSnapshot(), [eventId]: next });
}

export function updateOps(eventId: string, patch: (current: EventOps) => EventOps) {
  const all = getSnapshot();
  commit({ ...all, [eventId]: patch(opsFor(all, eventId)) });
}
