import { Platform } from "react-native";
import { createPersistedStore } from "@core/persistedStore";
import { currentSiteUrl } from "./site";

/**
 * Talking to the website's API. The app signs in with a token (the website gives it to the app at login), kept on the
 * phone and sent as "Authorization: Bearer ..." with every request. The website checks everything; the app only
 * shows what it answers.
 */
export const tokenStore = createPersistedStore<{ token: string }>("sl-events:auth-token:v1", { token: "" }, (stored) => ({
  token: stored && typeof stored === "object" && typeof (stored as { token?: unknown }).token === "string" ? (stored as { token: string }).token : "",
}));

export const currentToken = () => tokenStore.getSnapshot().token;
export const setToken = (token: string) => tokenStore.set({ token });

export type ApiResult<T> = { ok: boolean; status: number; data: T & { error?: string; errors?: Record<string, string> } };

export const OFFLINE = "We couldn't reach SL Events. Check your connection and try again.";

/**
 * Calls the API. A JSON body is sent as JSON, a FormData body as a file upload. Network failures, and requests the
 * website doesn't answer in time (20 seconds, or a minute for an upload), come back as status 0.
 */
export async function api<T = Record<string, unknown>>(path: string, init: { method?: string; body?: unknown } = {}): Promise<ApiResult<T>> {
  const token = currentToken();
  const isForm = typeof FormData !== "undefined" && init.body instanceof FormData;
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), isForm ? 60_000 : 20_000);
  try {
    const res = await fetch(`${currentSiteUrl()}${path}`, {
      method: init.method ?? (init.body === undefined ? "GET" : "POST"),
      headers: {
        "x-client": "app",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(init.body !== undefined && !isForm ? { "content-type": "application/json" } : {}),
      },
      body: init.body === undefined ? undefined : isForm ? (init.body as FormData) : JSON.stringify(init.body),
      signal: abort.signal,
    });
    const data = (await res.json().catch(() => ({}))) as ApiResult<T>["data"];
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: OFFLINE } as ApiResult<T>["data"] };
  } finally {
    clearTimeout(timer);
  }
}

/** The full address of a file on the website (a picture stored there, like an event cover). */
export const siteFile = (path: string) => (path.startsWith("/") ? `${currentSiteUrl()}${path}` : path);

/** A picked picture or file, ready to send: the phone's own file, or (in the browser preview) its contents. */
export type PickedFile = { uri: string; name: string; type?: string };

export async function appendFile(form: FormData, field: string, file: PickedFile) {
  if (Platform.OS === "web") {
    const blob = await (await fetch(file.uri)).blob();
    form.append(field, blob, file.name);
  } else {
    // React Native sends { uri, name, type } as the file itself.
    form.append(field, { uri: file.uri, name: file.name, type: file.type ?? "image/jpeg" } as unknown as Blob);
  }
}
