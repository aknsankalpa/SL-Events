/**
 * Decides what to do when the embedded website moves to a new address. Pure, so it can be tested without a phone.
 *
 *  - allow:    stay inside the organizer/admin area (including the event preview, which is shown in a frame)
 *  - logout:   the website's own "Log out" goes to the home or log-in page; the app signs the person out instead
 *  - event:    a public event page, which the app shows with its own event screen
 *  - external: any other site (maps, email, other domains) opens in the phone's browser
 */
export type Decision = { kind: "allow" } | { kind: "logout" } | { kind: "event"; slug: string } | { kind: "external"; url: string };

export function classify(target: string, base: string): Decision {
  if (/^(about:|data:|blob:|javascript:)/i.test(target)) return { kind: "allow" };
  let url: URL;
  let site: URL;
  try {
    url = new URL(target);
    site = new URL(base);
  } catch {
    return { kind: "allow" };
  }
  if (url.protocol === "mailto:" || url.protocol === "tel:") return { kind: "external", url: target };
  if (url.origin !== site.origin) return { kind: "external", url: target };
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (path === "/" || path === "/login") return { kind: "logout" };
  const event = path.match(/^\/events\/([^/]+)$/);
  if (event) return { kind: "event", slug: decodeURIComponent(event[1]!) };
  return { kind: "allow" };
}
