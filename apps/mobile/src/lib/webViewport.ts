import { Platform } from "react-native";

/**
 * Browser preview only. The page is sized with `height: 100%`, which iPhone Safari can make taller than the part of the
 * screen you can see, so the bottom tab bar slips behind Safari's toolbar. This sizes the page to the visible height
 * Safari reports instead, and follows it when the toolbar shows or hides or the phone turns. It also hides the browser's
 * own blue outline around text boxes, which show their own gold border while typing. Native apps don't need any of it.
 */
export function fitWebViewport() {
  if (Platform.OS !== "web" || typeof document === "undefined" || document.getElementById("app-viewport")) return;
  const style = document.createElement("style");
  style.id = "app-viewport";
  style.textContent = "html, body, #root { height: var(--app-height, 100%); } input:focus, textarea:focus { outline: none; }";
  document.head.appendChild(style);
  const fit = () => document.documentElement.style.setProperty("--app-height", `${window.visualViewport?.height ?? window.innerHeight}px`);
  fit();
  window.addEventListener("resize", fit);
  window.addEventListener("orientationchange", fit);
  window.visualViewport?.addEventListener("resize", fit);
}
