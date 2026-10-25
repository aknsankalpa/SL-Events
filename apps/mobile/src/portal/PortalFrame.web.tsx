import { createElement } from "react";
import type { FrameProps } from "./types";

/**
 * The browser preview of the app has no native web view, so it shows the website in a frame. Links the website
 * follows inside the frame cannot be intercepted from here (they are another site's page); only the phone app does that.
 */
export function PortalFrame({ url, reloadKey, onLoaded }: FrameProps) {
  return createElement("iframe", {
    key: reloadKey,
    src: url,
    title: "SL Events website",
    onLoad: onLoaded,
    style: { flex: 1, width: "100%", height: "100%", border: 0, backgroundColor: "#0b0907" },
  });
}
