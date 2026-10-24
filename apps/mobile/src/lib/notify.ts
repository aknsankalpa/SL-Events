import { Alert, Platform } from "react-native";

/** A short message that works on phones (Alert) and in the browser preview, where Alert shows nothing. */
export function notify(title: string, message?: string) {
  if (Platform.OS === "web") {
    (globalThis as { alert?: (m: string) => void }).alert?.(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}
