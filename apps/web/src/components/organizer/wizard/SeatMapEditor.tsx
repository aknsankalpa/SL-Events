"use client";

import { useEventDraft } from "./EventDraft";
import { ImageSeatMapBuilder, SeatMapStart } from "./ImageSeatMapBuilder";

/**
 * The seat map step. A chart starts from one of three places (an uploaded sketch, a rows table, or a blank canvas) and is
 * then edited in the same builder, so every chart has the same shape and works the same for buyers.
 */
export function SeatMapEditor() {
  const { draft } = useEventDraft();
  if (draft.seatMap.layout) return <ImageSeatMapBuilder />;
  return <SeatMapStart />;
}
