import DOMPurify from "dompurify";

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const looksLikeHtml = (s: string) => /^\s*<[a-z][\s\S]*>/i.test(s);

/** Turns plain text (blank-line separated paragraphs) into HTML. Existing HTML is returned unchanged. */
export function plainToHtml(text: string): string {
  if (!text.trim()) return "";
  if (looksLikeHtml(text)) return text;
  return text
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** The visible text of an HTML fragment, with paragraph breaks kept as blank lines. */
export function htmlToText(html: string): string {
  if (!html) return "";
  if (!looksLikeHtml(html)) return html;
  const withBreaks = html.replace(/<\/(p|li|h[1-6]|blockquote)>/gi, "$&\n\n").replace(/<br\s*\/?>/gi, "\n");
  if (typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(withBreaks, "text/html");
    return (doc.body.textContent ?? "").replace(/\n{3,}/g, "\n\n").trim();
  }
  return withBreaks.replace(/<[^>]*>/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

export const isEmptyHtml = (html: string | undefined) => !html || htmlToText(html).trim() === "";

const ALLOWED_TAGS = ["p", "br", "strong", "b", "em", "i", "u", "s", "h2", "h3", "ul", "ol", "li", "blockquote", "a", "hr"];

let hooked = false;

/**
 * Cleans organizer-written HTML before it is shown to buyers. Only formatting tags and safe links survive.
 * If the browser DOM isn't available (server render) it falls back to escaped plain text rather than risk
 * returning unsanitised markup.
 */
export function sanitizeRichHtml(html: string): string {
  if (!html) return "";
  if (typeof window === "undefined" || !DOMPurify.isSupported) return plainToHtml(htmlToText(html));

  if (!hooked) {
    hooked = true;
    DOMPurify.addHook("afterSanitizeAttributes", (node) => {
      if (node.tagName === "A") {
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener noreferrer nofollow");
      }
    });
  }
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ["href", "target", "rel"],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:)/i,
  });
}

/** Normalises what an organizer typed into a link field; returns null when it isn't a usable URL. */
export function normalizeUrl(input: string): string | null {
  const v = input.trim();
  if (!v) return null;
  if (/^(mailto:|tel:)/i.test(v)) return v;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return `mailto:${v}`;
  const withProtocol = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withProtocol);
    return u.hostname.includes(".") ? u.toString() : null;
  } catch {
    return null;
  }
}
