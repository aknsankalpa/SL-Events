import { Platform } from "react-native";

const CSS = [
  // The page fills exactly the visible screen (see below).
  "html, body, #root { height: var(--app-height, 100%); }",
  // Nothing may make the page wider than the screen or let it slide sideways.
  "html, body { overflow-x: hidden; overscroll-behavior-x: none; max-width: 100%; }",
  // iPhone Safari zooms in on any text box with text under 16px and doesn't zoom back out, which leaves the page wider
  // than the screen and draggable left and right. 16px stops that. Text boxes show their own gold border while typing,
  // so the browser's blue focus outline is turned off too.
  "input, textarea, select { font-size: 16px !important; }",
  "input:focus, textarea:focus { outline: none; }",
].join(" ");

/**
 * Browser preview only. Keeps the app fitted to the phone's screen in a mobile browser:
 *   - The page is sized with `height: 100%`, which iPhone Safari can make taller than the part of the screen you can
 *     see, so the bottom tab bar slips behind Safari's toolbar. This sizes it to the visible height Safari reports and
 *     follows it when the toolbar shows or hides or the phone turns.
 *   - The page never gets wider than the screen and never zooms in on its own, so it can't be dragged left and right.
 * Native apps don't need any of it.
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

  const fit = () => document.documentElement.style.setProperty("--app-height", `${window.visualViewport?.height ?? window.innerHeight}px`);
  fit();
  window.addEventListener("resize", fit);
  window.addEventListener("orientationchange", fit);
  window.visualViewport?.addEventListener("resize", fit);
}
