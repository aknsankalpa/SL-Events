import { Platform } from "react-native";
import { useCameraPermissions } from "expo-camera";

/**
 * Whether this device can use the camera for scanning. The installed app always can. A browser only allows the camera
 * on a secure (https) page, and older iPhone Safari (iOS 15) also lacks the permission check the camera library uses,
 * so the browser preview opened over http on a phone can't scan: the screens offer typing the ticket code instead.
 */
export function cameraAvailable(): boolean {
  if (Platform.OS !== "web") return true;
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return window.isSecureContext && !!navigator.mediaDevices?.getUserMedia && !!navigator.permissions?.query;
}

/** The camera permission, without asking a browser that can't use the camera at all (that throws instead of answering). */
export function useScanCamera() {
  const available = cameraAvailable();
  const [permission, request] = useCameraPermissions({ get: available });
  return {
    available,
    permission: available ? permission : null,
    request: () => {
      if (available) void request().catch(() => undefined);
    },
  };
}
