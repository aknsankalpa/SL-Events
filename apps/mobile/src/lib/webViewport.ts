import { Platform } from "react-native";

const CSS = [
  // The app is pinned to the edges of the visible screen. Safari keeps anything fixed to the bottom of the screen above
  // its own toolbar, so the bottom tab bar can't slip behind it (a height-based fit isn't enough on iOS 15, where the
  // toolbar can float over the page).
  "html, body { height: 100%; }",
  "#root { position: fixed; top: 0; right: 0; bottom: 0; left: 0; height: auto !important; }",
  // Nothing may make the page wider than the screen or let it slide sideways.
  "html, body { overflow-x: hidden; overscroll-behavior: none; max-width: 100%; }",
  // iPhone Safari zooms in on any text box with text under 16px and doesn't zoom back out, which leaves the page wider
  // than the screen and draggable left and right. 16px stops that. Text boxes show their own gold border while typing,
  // so the browser's blue focus outline is turned off too.
  "input, textarea, select { font-size: 16px !important; }",
  "input:focus, textarea:focus { outline: none; }",
].join(" ");

/**
 * Browser preview only. Keeps the app fitted to the phone's screen in a mobile browser: the tab bar stays above
 * Safari's toolbar, and the page never gets wider than the screen or zooms in on its own, so it can't be dragged left
 * and right. Native apps don't need any of it.
 */
export function fitWebViewport() {
  if (Platform.OS !== "web" || typeof document === "undefined" || document.getElementById("app-viewport")) return;
  const style = document.createElement("style");
  style.id = "app-viewport";
  style.textContent = CSS;
  document.head.appendChild(style);

  // Start at the screen's width and don't zoom on its own. People can still pinch to zoom on iOS, which ignores the
  // maximum for accessibility; this only stops the automatic zoom on text boxes.
  let meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "viewport";
    document.head.appendChild(meta);
  }
  meta.content = "width=device-width, initial-scale=1, maximum-scale=1, shrink-to-fit=no";
}
