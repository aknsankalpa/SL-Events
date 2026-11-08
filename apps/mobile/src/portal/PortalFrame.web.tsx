import { createElement, useEffect } from "react";
import type { FrameProps } from "./types";

/**
 * The browser preview of the app has no native web view, so it shows the website in a frame. Links the website
 * follows inside the frame cannot be intercepted from here (they are another site's page); only the phone app does that.
 */
export function PortalFrame({ url, reloadKey, onLoaded, onFailed }: FrameProps) {
  // A frame never reports a page that failed to load, so ask the website directly first: if nothing answers, say so
  // straight away instead of leaving the loading spinner up.
  useEffect(() => {
    let alive = true;
    fetch(url, { mode: "no-cors", cache: "no-store" }).catch(() => {
      if (alive) onFailed("Nothing answered at this address.");
    });
    return () => {
      alive = false;
    };
    // Checked again on every reload; the callbacks are new functions on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, reloadKey]);

  return createElement("iframe", {
    key: reloadKey,
    src: url,
    title: "SL Events website",
    onLoad: onLoaded,
    style: { flex: 1, width: "100%", height: "100%", border: 0, backgroundColor: "#0b0907" },
  });
}
