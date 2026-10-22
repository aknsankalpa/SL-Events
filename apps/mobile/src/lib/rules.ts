import { Linking, Platform, Share } from "react-native";

/** Booking limits. The same numbers as apps/web/src/components/booking/TicketSelector.tsx; the server must enforce them. */
export const MAX_TICKETS = 10;
export const BOOKING_FEE = 0;

/** Organizer-written descriptions are HTML on the website. The app shows them as plain paragraphs. */
export function htmlToParagraphs(html: string): string[] {
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export const openUrl = (url: string) => Linking.openURL(url).catch(() => undefined);

/** The system share sheet on phones; on the web preview, which has none, the text is copied by the browser's share or ignored. */
export async function shareText(message: string) {
  try {
    if (Platform.OS === "web") {
      const nav = (globalThis as { navigator?: { share?: (d: { text: string }) => Promise<void> } }).navigator;
      await nav?.share?.({ text: message });
      return;
    }
    await Share.share({ message });
  } catch {
    /* the person closed the sheet */
  }
}
