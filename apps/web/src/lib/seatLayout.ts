import type { DetectionSettings, LayoutSeat, SeatLayout, SeatSection } from "./organizer";
import { defaultDetection, detectSeats, numberSeats, type Detection } from "./seatDetect";

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

/** Re-derives row and seat numbers after seats are added or removed, keeping each seat's section and flags. */
export function renumber(seats: LayoutSeat[], settings: DetectionSettings): LayoutSeat[] {
  return numberSeats(seats, settings);
}
