"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { OrgBooking } from "@/lib/organizer";

export type DashboardData = {
  stats: {
    soldChangePct: number;
    revenueChangePct: number;
    avgTicketPrice: number;
    ticketsSold: number;
    soldThisWeek: number;
    revenue: number;
    revenueThisWeek: number;
    waiting: number;
    waitingAmount: number;
    ticketsLeft: number;
    ticketsTotal: number;
  };
  dailySales: { date: string; label: string; value: number }[];
  salesByTicket: { label: string; event: string; sold: number; of: number }[];
  waitingQueue: { booking: string; buyer: string; amount: number; sinceIso: string }[];
  bookings: (OrgBooking & { event: string })[];
};

export const EMPTY_DASHBOARD: DashboardData = {
  stats: { soldChangePct: 0, revenueChangePct: 0, avgTicketPrice: 0, ticketsSold: 0, soldThisWeek: 0, revenue: 0, revenueThisWeek: 0, waiting: 0, waitingAmount: 0, ticketsLeft: 0, ticketsTotal: 0 },
  dailySales: [],
  salesByTicket: [],
  waitingQueue: [],
  bookings: [],
};

let data: DashboardData = EMPTY_DASHBOARD;
let loadedAt = 0;
const listeners = new Set<() => void>();

async function load() {
  try {
    const res = await fetch("/api/organizer/dashboard", { credentials: "same-origin", cache: "no-store" });
    if (res.ok) data = (await res.json()) as DashboardData;
    loadedAt = Date.now();
  } catch {
    /* keep what is shown */
  }
  listeners.forEach((l) => l());
}

/** The organizer's dashboard figures from the server, shared by the dashboard's parts. Refreshes every minute. */
export function useDashboard(): DashboardData {
  const value = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => data,
    () => EMPTY_DASHBOARD,
  );
  useEffect(() => {
    if (Date.now() - loadedAt > 10_000) void load();
    const id = setInterval(() => void load(), 60_000);
    return () => clearInterval(id);
  }, []);
  return value;
}
