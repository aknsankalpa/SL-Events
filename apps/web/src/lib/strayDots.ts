/**
 * Finds dots that were picked up as seats but probably aren't: row letters, legend markers, text, a second mark
 * inside the same seat icon. Everything here is a suggestion for the organizer to review, never an automatic delete,
 * because a plan can legitimately mix seat colours (price tiers) or have a short row of box seats.
 */

export type StrayReason = "duplicate" | "size" | "position" | "colour";

export const strayReasonLabel: Record<StrayReason, string> = {
  duplicate: "sits on top of another seat",
  size: "is a different size",
  position: "is in a row of its own",
  colour: "is a different colour from most seats",
};

type Dot = { uid: string; x: number; y: number; r: number; row: string };
type Rgb = [number, number, number];

/** A coarse colour name, so two slightly different teals count as the same and teal vs yellow don't. */
export function colourBucket([r, g, b]: Rgb): string {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const d = max - min;
  if (max < 0.2 || d / (max || 1) < 0.22) return `grey${Math.round(max * 3)}`;
  let h: number;
  const rn = r / 255, gn = g / 255, bn = b / 255;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  h = (h * 60 + 360) % 360;
  return `hue${Math.floor(h / 30)}`;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[s.length >> 1]! : 0;
};

export function findStrays(seats: Dot[], colourOf: (seat: Dot) => Rgb): Map<string, StrayReason> {
  const out = new Map<string, StrayReason>();
  if (seats.length < 8) return out;

  // 1. Two dots on top of each other: the smaller one is the extra mark.
  const bySize = [...seats].sort((a, b) => b.r - a.r);
  const kept: Dot[] = [];
  for (const s of bySize) {
    const clash = kept.some((k) => Math.hypot(k.x - s.x, k.y - s.y) < 0.9 * Math.max(k.r, s.r));
    if (clash) out.set(s.uid, "duplicate");
    else kept.push(s);
  }

  // 2. Much bigger or smaller than a typical seat.
  const mr = median(seats.map((s) => s.r));
  for (const s of seats) if (!out.has(s.uid) && (s.r < 0.55 * mr || s.r > 1.7 * mr)) out.set(s.uid, "size");

  // 3. A row with one or two dots when real rows are long: legend dots, a title, stray text.
  const rows = new Map<string, Dot[]>();
  for (const s of seats) if (!out.has(s.uid)) (rows.get(s.row) ?? rows.set(s.row, []).get(s.row)!).push(s);
  const typicalRow = median([...rows.values()].map((r) => r.length));
  if (typicalRow >= 6) {
    for (const list of rows.values()) if (list.length <= 2) for (const s of list) out.set(s.uid, "position");
  }

  // 4. A colour that only a small minority of seats have, when one colour clearly dominates.
  const rest = seats.filter((s) => !out.has(s.uid));
  if (rest.length >= 8) {
    const counts = new Map<string, number>();
    const bucketOf = new Map<string, string>();
    for (const s of rest) {
      const b = colourBucket(colourOf(s));
      bucketOf.set(s.uid, b);
      counts.set(b, (counts.get(b) ?? 0) + 1);
    }
    const top = Math.max(...counts.values());
    if (top / rest.length >= 0.5) {
      for (const s of rest) {
        const share = counts.get(bucketOf.get(s.uid)!)! / rest.length;
        if (share < 0.15) out.set(s.uid, "colour");
      }
    }
  }
  return out;
}
