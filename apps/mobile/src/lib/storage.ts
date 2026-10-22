import AsyncStorage from "@react-native-async-storage/async-storage";
import { storage } from "@core/persistedStore";

/**
 * The web app's stores read and write synchronously, but phone storage is asynchronous. So everything saved under
 * "sl-events:" is loaded into memory once at start-up (before the first screen renders), and every write goes to memory
 * at once and to the phone's storage in the background. Call `prepareStorage()` once, before any store is read.
 */
const PREFIX = "sl-events:";
const memory = new Map<string, string>();
let ready: Promise<void> | null = null;

export function prepareStorage(): Promise<void> {
  ready ??= (async () => {
    try {
      const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
      const pairs = await AsyncStorage.multiGet(keys);
      for (const [k, v] of pairs) if (v !== null) memory.set(k, v);
    } catch {
      /* unreadable storage: start empty, the app still works for this session */
    }
    storage.current = {
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => {
        memory.set(key, value);
        AsyncStorage.setItem(key, value).catch(() => undefined);
      },
    };
  })();
  return ready;
}

/** Clears everything the app saved on this phone (used by "Delete account" and the demo reset). */
export async function clearStorage() {
  memory.clear();
  const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
  await AsyncStorage.multiRemove(keys);
}
