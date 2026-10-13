"use client";

import { createContext, useContext, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import {
  capacityOf,
  parseRows,
  seatIds,
  sectionStats,
  seatMapSectionStats,
  seatSectionTemplates,
  type DraftTicketType,
  type EventDraft,
  type SeatMapState,
} from "@/lib/organizer";

export type { DraftTicketType, SeatMapState, EventDraft };

export const VENUE_LIMIT = 500;

const initial: EventDraft = {
  name: "Kandyan Dance Gala 2026",
  category: "Culture",
  tags: "Dance · Drumming · Family",
  description:
    "<p>An evening of Kandyan, low-country and Sabaragamuwa dance by Sri Lankan dancers living in Korea, with live drumming.</p>",
  date: "2026-12-19",
  doorsOpen: "17:30",
  starts: "18:30",
  venue: "Ansan Arts Center, Main Hall",
  address: "Danwon-gu, Ansan",
  organizerName: "Lanka Beats Korea",
  organizerAbout: "",
  organizerEmail: "",
  organizerPhone: "",
  organizerLink: "",
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

export { capacityOf, parseRows, seatIds, seatMapSectionStats, sectionStats };
