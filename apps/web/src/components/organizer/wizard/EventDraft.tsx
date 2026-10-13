"use client";

import { createContext, useContext, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { seatSectionTemplates, type SeatSection } from "@/lib/organizer";

export type DraftTicketType = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  maxPerOrder: number;
  color: string; // hex
  saleNote: string;
  perks: string;
  visible: boolean;
};

export type SeatMapState = {
  template: string;
  sections: SeatSection[];
  blocked: string[]; // seat ids like "H8"
  accessible: string[];
};

export type EventDraft = {
  name: string;
  category: string;
  tags: string;
  description: string;
  date: string; // "2026-12-19"
  doorsOpen: string; // "17:30"
  starts: string; // "18:30"
  venue: string;
  address: string;
  sellMode: "tickets" | "seats";
  coverName: string;
  coverUrl: string;
  ticketTypes: DraftTicketType[];
  seatMap: SeatMapState;
  pricingReviewed: boolean;
};

export const VENUE_LIMIT = 500;

const initial: EventDraft = {
  name: "Kandyan Dance Gala 2026",
  category: "Culture",
  tags: "Dance · Drumming · Family",
  description:
    "An evening of Kandyan, low-country and Sabaragamuwa dance by Sri Lankan dancers living in Korea, with live drumming.",
  date: "2026-12-19",
  doorsOpen: "17:30",
  starts: "18:30",
  venue: "Ansan Arts Center, Main Hall",
  address: "Danwon-gu, Ansan",
  sellMode: "tickets",
  coverName: "",
  coverUrl: "",
  ticketTypes: [
    { id: "vvip", name: "VVIP", price: 90000, quantity: 30, maxPerOrder: 4, color: "#ef2b2b", saleNote: "On sale now until 18 Dec", perks: "Front row, backstage visit, dinner", visible: true },
    { id: "vip", name: "VIP", price: 55000, quantity: 80, maxPerOrder: 6, color: "#f7cb60", saleNote: "On sale now until 18 Dec", perks: "Reserved seating area", visible: true },
    { id: "general", name: "General", price: 30000, quantity: 300, maxPerOrder: 10, color: "#ece7dc", saleNote: "On sale now until 19 Dec, 5:00 PM", perks: "Free seating", visible: true },
    { id: "student", name: "Student", price: 20000, quantity: 60, maxPerOrder: 2, color: "#b5ada0", saleNote: "On sale now until 18 Dec", perks: "Student ID checked at the door", visible: true },
  ],
  seatMap: {
    template: "Theatre with balcony",
    sections: seatSectionTemplates["Theatre with balcony"]!,
    blocked: ["H8", "H9"],
    accessible: ["A1", "A16"],
  },
  pricingReviewed: false,
};

type Ctx = { draft: EventDraft; setDraft: Dispatch<SetStateAction<EventDraft>>; patch: (p: Partial<EventDraft>) => void };

const DraftCtx = createContext<Ctx | null>(null);

export function EventDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<EventDraft>(initial);
  const value = useMemo<Ctx>(
    () => ({ draft, setDraft, patch: (p) => setDraft((d) => ({ ...d, ...p })) }),
    [draft],
  );
  return <DraftCtx.Provider value={value}>{children}</DraftCtx.Provider>;
}

export function useEventDraft() {
  const ctx = useContext(DraftCtx);
  if (!ctx) throw new Error("useEventDraft must be used inside <EventDraftProvider>");
  return ctx;
}

/* ---------- seat helpers shared by the editor and the review step ---------- */

/** "A to H" → ["A", ..., "H"]; returns null when the text can't be parsed. */
export function parseRows(text: string): string[] | null {
  const m = text.trim().toUpperCase().match(/^([A-Z])\s*(?:TO|-|–)\s*([A-Z])$/);
  if (!m) return null;
  const [from, to] = [m[1]!.charCodeAt(0), m[2]!.charCodeAt(0)];
  if (to < from) return null;
  return Array.from({ length: to - from + 1 }, (_, i) => String.fromCharCode(from + i));
}

export function seatIds(section: SeatSection): string[] {
  const rows = parseRows(section.rows) ?? [];
  return rows.flatMap((r) => Array.from({ length: section.seatsPerRow }, (_, i) => `${r}${i + 1}`));
}

export function sectionStats(section: SeatSection, blocked: string[]) {
  const all = seatIds(section);
  const free = all.filter((id) => !blocked.includes(id)).length;
  return { total: all.length, free, revenue: free * section.price };
}

export function capacityOf(types: DraftTicketType[]) {
  const sellable = types.filter((t) => t.visible);
  return {
    tickets: sellable.reduce((n, t) => n + t.quantity, 0),
    revenue: sellable.reduce((n, t) => n + t.quantity * t.price, 0),
  };
}
