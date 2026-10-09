/** Builds an .ics file body for a single event. `startsAt` is an ISO string; duration defaults to 3 hours. */
export function buildIcs(opts: { title: string; startsAt: string; location: string; description?: string; hours?: number }) {
  const start = new Date(opts.startsAt);
  const end = new Date(start.getTime() + (opts.hours ?? 3) * 3600_000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (s: string) => s.replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SL Events//EN",
    "BEGIN:VEVENT",
    `UID:${fmt(start)}-${encodeURIComponent(opts.title)}@slevents.kr`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${esc(opts.title)}`,
    `LOCATION:${esc(opts.location)}`,
    opts.description ? `DESCRIPTION:${esc(opts.description)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

export function downloadIcs(fileName: string, ics: string) {
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export const naverMapUrl = (query: string) => `https://map.naver.com/p/search/${encodeURIComponent(query)}`;
