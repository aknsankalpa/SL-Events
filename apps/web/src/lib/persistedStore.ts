/**
 * A tiny localStorage-backed external store, for React's useSyncExternalStore. It stands in for API calls until the
 * backend exists: reads fall back to `fallback` (the seed data) and the first write persists the whole value.
 *
 *   const store = createPersistedStore("key", seed);
 *   const value = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
 */
export function createPersistedStore<T>(key: string, fallback: T) {
  let cache: T = fallback;
  let loaded = false;
  const listeners = new Set<() => void>();

  function read(): T {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }

  const emit = () => listeners.forEach((l) => l());

  return {
    getSnapshot(): T {
      if (!loaded) {
        cache = read();
        loaded = true;
      }
      return cache;
    },
    getServerSnapshot(): T {
      return fallback;
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      const onStorage = (e: StorageEvent) => {
        if (e.key === key) {
          loaded = false;
          listener();
        }
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
      };
    },
    set(next: T) {
      cache = next;
      loaded = true;
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* storage full or blocked: the in-memory value still serves this session */
      }
      emit();
    },
    update(change: (current: T) => T) {
      this.set(change(this.getSnapshot()));
    },
  };
}
