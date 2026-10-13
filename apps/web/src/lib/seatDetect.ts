// Finds seats in a picture of a seating plan, entirely in the browser (no upload, no AI service).
//
//   1. grayscale  →  2. brightness cut-off (Otsu)  →  3. connected blobs  →  4. keep the repeated seat-sized shapes
//   →  5. group into rows and number them.
//
// Pure functions over plain pixel arrays, so they can be tested without a DOM. Keep this file free of runtime imports.
import type { DetectionSettings } from "./organizer";

/** Fewest repeated shapes that count as a seating plan. */
export const MIN_SEATS = 4;

export const defaultDetection: DetectionSettings = {
  polarity: "auto",
  threshold: 0,
  sizeRange: [0.6, 1.7],
  rowTolerance: 0.6,
  rowOrder: "top-down",
  seatOrder: "left-right",
};

export type Pixels = { data: Uint8ClampedArray | Uint8Array; width: number; height: number };
export type Blob = { cx: number; cy: number; w: number; h: number; area: number };
export type FoundSeat = { x: number; y: number; r: number };

export type Detection = {
  seats: FoundSeat[];
  /** The brightness cut-off that was used (0-255). */
  threshold: number;
  /** What was treated as a seat: shapes darker or lighter than the background. */
  polarity: "dark" | "light";
  /** Typical seat diameter in pixels. 0 when nothing seat-like was found. */
  unit: number;
  /** How many separate shapes the picture contained before filtering. */
  shapes: number;
};

/** RGBA to 0-255 grayscale, laying transparent pixels over white so a transparent PNG reads as a white plan. */
export function toGray(img: Pixels): Uint8Array {
  const { data, width, height } = img;
  const out = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < out.length; i++, p += 4) {
    const a = data[p + 3]! / 255;
    const g = 0.299 * data[p]! + 0.587 * data[p + 1]! + 0.114 * data[p + 2]!;
    out[i] = Math.round(g * a + 255 * (1 - a));
  }
  return out;
}

/** Otsu's method: the cut-off that best separates the picture into two brightness groups. */
export function otsu(gray: Uint8Array): number {
  const hist = new Array<number>(256).fill(0);
  for (let i = 0; i < gray.length; i++) hist[gray[i]!]!++;
  const total = gray.length;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t]!;
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let bestVar = -1;
  for (let t = 0; t < 256; t++) {
    wB += hist[t]!;
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t]!;
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > bestVar) {
      bestVar = between;
      best = t;
    }
  }
  return best;
}

/** Connected groups of foreground pixels (4-neighbour). Iterative, so large images can't overflow the call stack. */
export function findBlobs(gray: Uint8Array, width: number, height: number, threshold: number, foregroundDark: boolean): Blob[] {
  const n = width * height;
  const fg = new Uint8Array(n);
  // Otsu returns the highest level of the darker class, so "dark" is <= the cut-off and "light" is above it.
  for (let i = 0; i < n; i++) fg[i] = (foregroundDark ? gray[i]! <= threshold : gray[i]! > threshold) ? 1 : 0;

  const seen = new Uint8Array(n);
  const stack = new Int32Array(n);
  const blobs: Blob[] = [];

  for (let start = 0; start < n; start++) {
    if (!fg[start] || seen[start]) continue;
    let sp = 0;
    stack[sp++] = start;
    seen[start] = 1;
    let area = 0;
    let sx = 0;
    let sy = 0;
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;

    while (sp > 0) {
      const p = stack[--sp]!;
      const x = p % width;
      const y = (p - x) / width;
      area++;
      sx += x;
      sy += y;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      // Visit the four neighbours that are foreground and not yet seen.
      if (x > 0 && fg[p - 1] && !seen[p - 1]) {
        seen[p - 1] = 1;
        stack[sp++] = p - 1;
      }
      if (x < width - 1 && fg[p + 1] && !seen[p + 1]) {
        seen[p + 1] = 1;
        stack[sp++] = p + 1;
      }
      if (y > 0 && fg[p - width] && !seen[p - width]) {
        seen[p - width] = 1;
        stack[sp++] = p - width;
      }
      if (y < height - 1 && fg[p + width] && !seen[p + width]) {
        seen[p + width] = 1;
        stack[sp++] = p + width;
      }
    }

    if (area >= 6) blobs.push({ cx: sx / area, cy: sy / area, w: maxX - minX + 1, h: maxY - minY + 1, area });
  }
  return blobs;
}

const median = (xs: number[]) => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

/**
 * Picks the shapes that look like seats: roughly square-ish blobs of the most common size. Text, borders and the
 * stage are a different size or shape, and each is far rarer than the seats, so they fall out.
 */
export function pickSeatBlobs(blobs: Blob[], sizeRange: [number, number]): { seats: FoundSeat[]; unit: number } {
  const candidates = blobs.filter((b) => {
    if (b.w < 4 || b.h < 4) return false;
    const aspect = b.w / b.h;
    const fill = b.area / (b.w * b.h);
    return aspect >= 0.55 && aspect <= 1.8 && fill >= 0.2;
  });
  if (candidates.length === 0) return { seats: [], unit: 0 };

  const sized = candidates.map((b) => ({ b, size: (b.w + b.h) / 2 })).sort((a, b) => a.size - b.size);

  // The densest run of similar sizes (within 30% of each other) is the seat size.
  let bestStart = 0;
  let bestCount = 0;
  let j = 0;
  for (let i = 0; i < sized.length; i++) {
    if (j < i) j = i;
    while (j + 1 < sized.length && sized[j + 1]!.size <= sized[i]!.size * 1.3) j++;
    if (j - i + 1 > bestCount) {
      bestCount = j - i + 1;
      bestStart = i;
    }
  }
  const unit = median(sized.slice(bestStart, bestStart + bestCount).map((s) => s.size));
  const [lo, hi] = sizeRange;
  const seats = sized
    .filter((s) => s.size >= unit * lo && s.size <= unit * hi)
    .map(({ b, size }) => ({ x: b.cx, y: b.cy, r: Math.max(3, size / 2) }));
  return { seats, unit };
}

export function detectSeats(img: Pixels, settings: DetectionSettings): Detection {
  const gray = toGray(img);
  const threshold = Math.min(250, Math.max(5, otsu(gray) + settings.threshold));

  let dark = 0;
  for (let i = 0; i < gray.length; i++) if (gray[i]! <= threshold) dark++;
  const polarity: "dark" | "light" =
    settings.polarity === "auto" ? (dark <= gray.length - dark ? "dark" : "light") : settings.polarity;

  const blobs = findBlobs(gray, img.width, img.height, threshold, polarity === "dark");
  const picked = pickSeatBlobs(blobs, settings.sizeRange);
  // A seating plan repeats its seat shape many times. One or two lookalikes is a logo or a button, not a venue.
  const seats = picked.seats.length >= MIN_SEATS ? picked.seats : [];
  return { seats, threshold, polarity, unit: seats.length ? picked.unit : 0, shapes: blobs.length };
}

/** A, B, … Z, AA, AB, … */
export function rowLabel(index: number): string {
  let n = index;
  let label = "";
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return label;
}

/**
 * Groups seats into rows by their vertical position and numbers each row left to right. Everything else on the
 * seat object is carried through untouched, so a seat keeps its section and flags when numbers change.
 */
export function numberSeats<T extends { x: number; y: number; r: number }>(
  seats: T[],
  settings: Pick<DetectionSettings, "rowTolerance" | "rowOrder" | "seatOrder">,
): (T & { row: string; num: number })[] {
  if (seats.length === 0) return [];
  const tolerance = settings.rowTolerance * 2 * median(seats.map((s) => s.r));

  const byY = [...seats].sort((a, b) => a.y - b.y || a.x - b.x);
  const rows: { sum: number; items: T[] }[] = [];
  for (const s of byY) {
    let best = -1;
    let bestDist = Infinity;
    for (let i = 0; i < rows.length; i++) {
      const d = Math.abs(rows[i]!.sum / rows[i]!.items.length - s.y);
      if (d <= tolerance && d < bestDist) {
        best = i;
        bestDist = d;
      }
    }
    if (best === -1) rows.push({ sum: s.y, items: [s] });
    else {
      rows[best]!.sum += s.y;
      rows[best]!.items.push(s);
    }
  }

  rows.sort((a, b) => a.sum / a.items.length - b.sum / b.items.length);
  if (settings.rowOrder === "bottom-up") rows.reverse();

  const out: (T & { row: string; num: number })[] = [];
  rows.forEach((row, ri) => {
    const items = [...row.items].sort((a, b) => (settings.seatOrder === "left-right" ? a.x - b.x : b.x - a.x));
    items.forEach((s, i) => out.push({ ...s, row: rowLabel(ri), num: i + 1 }));
  });
  return out;
}
