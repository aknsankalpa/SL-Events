import type { DetectionSettings, LayoutSeat, SeatLayout, SeatSection } from "./organizer";
import { defaultDetection, detectSeats, findBlobs, numberSeats, otsu, toGray, type Detection } from "./seatDetect";
import { findStrays, type StrayReason } from "./strayDots";
import { CHART_WIDTH, defaultStage, rowIndex, rowLabel } from "./seating";

/** Widest side kept for the stored plan. Big enough to see seats clearly, small enough for localStorage. */
const MAX_WIDTH = 1400;

export const sectionPalette = ["#f7cb60", "#e0281f", "#60a5fa", "#4ade80", "#ece7dc", "#c084fc", "#fb923c", "#2dd4bf"];

let counter = 0;
/** Unique within a session, and across sessions because of the time prefix. */
export const newSeatUid = () => `s${Date.now().toString(36)}${(counter++).toString(36)}`;

/** Decodes an image URL into a canvas and returns its pixels. */
async function pixelsOf(src: string): Promise<{ data: ImageData; width: number; height: number }> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas is not available");
  // Fill white first so a transparent PNG is read as a white plan, not black.
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  return { data: ctx.getImageData(0, 0, canvas.width, canvas.height), width: canvas.width, height: canvas.height };
}

/** Downscales an uploaded picture and returns it as a JPEG data URL with its size. */
export async function readPlanFile(file: File): Promise<{ imageUrl: string; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_WIDTH / bitmap.width);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return { imageUrl: canvas.toDataURL("image/jpeg", 0.88), width, height };
}

/** Runs detection on a stored plan image and returns numbered seats, all placed in `sectionId`. */
export async function detectLayoutSeats(
  imageUrl: string,
  settings: DetectionSettings,
  sectionId: string,
): Promise<{ seats: LayoutSeat[]; detection: Detection }> {
  const { data, width, height } = await pixelsOf(imageUrl);
  const detection = detectSeats({ data: data.data, width, height }, settings);
  const seats = numberSeats(
    detection.seats.map((s) => ({ ...s, uid: newSeatUid(), section: sectionId as string | null })),
    settings,
  );
  return { seats, detection };
}

export const defaultSections = (): SeatSection[] => [
  { id: "main", name: "All seats", color: sectionPalette[0]!, price: 30000, rows: "—", seatsPerRow: 0, aisleAfter: 0, numbering: "1 → 16", seatType: "Single" },
];

export function emptyLayout(plan: { imageUrl: string; width: number; height: number }, seats: LayoutSeat[] = []): SeatLayout {
  return { ...plan, seats, settings: defaultDetection };
}

/** A chart with no picture and no seats yet: the blank canvas, or the start of a rows table. */
export function blankLayout(): SeatLayout {
  return { imageUrl: "", width: CHART_WIDTH, height: 900, seats: [], settings: defaultDetection, stage: defaultStage() };
}

/**
 * Re-derives row and seat numbers after seats are added or removed, keeping each seat's section and flags.
 * Seats made with the rows table (`locked`) keep the labels they were given; only loose seats are numbered by position,
 * and their rows take letters that no locked row uses, so two rows never share a label.
 */
export function renumber(seats: LayoutSeat[], settings: DetectionSettings): LayoutSeat[] {
  const locked = seats.filter((s) => s.locked);
  if (locked.length === 0) return numberSeats(seats, settings);
  const loose = numberSeats(
    seats.filter((s) => !s.locked),
    settings,
  );
  const used = new Set(locked.map((s) => rowIndex(s.row)));
  const remap = new Map<string, string>();
  let next = 0;
  for (const label of [...new Set(loose.map((s) => s.row))].sort((a, b) => rowIndex(a) - rowIndex(b))) {
    while (used.has(next)) next++;
    remap.set(label, rowLabel(next++));
  }
  return [...locked, ...loose.map((s) => ({ ...s, row: remap.get(s.row) ?? s.row }))];
}

/**
 * Dots that were picked up as seats but probably aren't (row letters, markers, a second mark in the same icon).
 * Each dot's colour is read from the picture, so a yellow marker among teal seats stands out.
 */
export async function findStrayDots(imageUrl: string, seats: LayoutSeat[]): Promise<Map<string, StrayReason>> {
  if (seats.length < 8) return new Map();
  const { data, width, height } = await pixelsOf(imageUrl);
  const px = data.data;
  return findStrays(seats, (seat) => {
    const rad = Math.max(1, Math.round(seat.r * 0.6));
    let r = 0, g = 0, b = 0, n = 0;
    for (let dy = -rad; dy <= rad; dy++) {
      for (let dx = -rad; dx <= rad; dx++) {
        if (dx * dx + dy * dy > rad * rad) continue;
        const x = Math.round(seat.x) + dx;
        const y = Math.round(seat.y) + dy;
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        const i = (y * width + x) * 4;
        r += px[i]!;
        g += px[i + 1]!;
        b += px[i + 2]!;
        n++;
      }
    }
    return n ? [r / n, g / n, b / n] : [255, 255, 255];
  });
}

/**
 * The picture with everything seat-sized or smaller painted out: the seat marks themselves (the chart draws its own),
 * row letters, little markers and text. Only large shapes such as the stage and walls remain, as context.
 */
export async function cleanPlanImage(imageUrl: string, settings: DetectionSettings, seatDiameter: number): Promise<string> {
  const { data, width, height } = await pixelsOf(imageUrl);
  const gray = toGray({ data: data.data, width, height });
  const threshold = Math.min(250, Math.max(5, otsu(gray) + settings.threshold));
  let dark = 0;
  for (let i = 0; i < gray.length; i++) if (gray[i]! <= threshold) dark++;
  const foregroundDark = settings.polarity === "auto" ? dark <= gray.length - dark : settings.polarity === "dark";
  const blobs = findBlobs(gray, width, height, threshold, foregroundDark);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");
  ctx.putImageData(data, 0, 0);

  const limit = Math.max(seatDiameter, 6) * 2.2;
  const px = data.data;
  for (const b of blobs) {
    if ((b.w + b.h) / 2 > limit) continue;
    // Paint with the colour just outside the shape's corner, so a gradient background doesn't show patches.
    const sx = Math.min(width - 1, Math.max(0, Math.round(b.cx - b.w / 2 - 3)));
    const sy = Math.min(height - 1, Math.max(0, Math.round(b.cy - b.h / 2 - 3)));
    const i = (sy * width + sx) * 4;
    ctx.fillStyle = `rgb(${px[i]},${px[i + 1]},${px[i + 2]})`;
    ctx.fillRect(b.cx - b.w / 2 - 2, b.cy - b.h / 2 - 2, b.w + 4, b.h + 4);
  }
  return canvas.toDataURL("image/jpeg", 0.8);
}
