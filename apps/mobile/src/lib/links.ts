/**
 * The shared notification and booking code uses the website's addresses (/my-tickets/SL-1, /bookings/SL-1/proof…).
 * This turns one into the matching screen of the app.
 */
export function appHref(webHref: string): string {
  const [path = ""] = webHref.split("?");
  let m: RegExpMatchArray | null;
  if ((m = path.match(/^\/my-tickets\/([^/]+)\/?$/))) return `/booking/${m[1]}/tickets`;
  if ((m = path.match(/^\/bookings\/([^/]+)\/proof\/?$/))) return `/booking/${m[1]}/proof`;
  if ((m = path.match(/^\/bookings\/([^/]+)/))) return `/booking/${m[1]}`;
  if ((m = path.match(/^\/events\/([^/]+)/))) return `/event/${m[1]}`;
  if (path === "/payment-instructions" || path === "/help" || path === "/faq") return "/help";
  return "/";
}
