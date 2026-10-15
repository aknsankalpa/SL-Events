import { normalizeCreatedEvent, type OrganizerEvent } from "./organizer";

/**
 * Events the organizer creates in the wizard, kept in localStorage so drafts survive a reload until the API
 * exists. It is a tiny external store so React can read it with useSyncExternalStore (no setState-in-effect,
 * no hydration mismatch). Replace with API calls when the backend lands.
 */
const KEY = "sl-events:organizer-created-events:v1";
const EMPTY: OrganizerEvent[] = [];

let cache: OrganizerEvent[] | null = null;
const listeners = new Set<() => void>();

function read(): OrganizerEvent[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeCreatedEvent).filter((e): e is OrganizerEvent => e !== null);
  } catch {
    return [];
  }
}

function commit(next: OrganizerEvent[]) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage full or blocked: the in-memory copy still works for this session */
  }
  listeners.forEach((l) => l());
}

export function getSnapshot(): OrganizerEvent[] {
  if (cache === null) cache = read();
  return cache;
}

export function getServerSnapshot(): OrganizerEvent[] {
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

export const addCreatedEvent = (e: OrganizerEvent) => commit([e, ...getSnapshot()]);

export const updateCreatedEvent = (id: string, patch: Partial<OrganizerEvent>) =>
  commit(getSnapshot().map((e) => (e.id === id ? { ...e, ...patch } : e)));

export const isCreatedEvent = (id: string) => getSnapshot().some((e) => e.id === id);
