"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import {
  seedUsers,
  type AdminEvent,
  type AdminUser,
  type AuditEntry,
  type AppStatus,
  type OrganizerApp,
} from "@/lib/admin";
import { adminStore, auditWritten, configStore } from "@/lib/adminStore";

export const useAdminState = () => useSyncExternalStore(adminStore.subscribe, adminStore.getSnapshot, adminStore.getServerSnapshot);
export const useAdminConfig = () => useSyncExternalStore(configStore.subscribe, configStore.getSnapshot, configStore.getServerSnapshot);
/* ---------- the audit log, from the server ---------- */

const NO_ENTRIES: AuditEntry[] = [];
let auditEntries: AuditEntry[] = NO_ENTRIES;
const auditListeners = new Set<() => void>();
let auditLoaded = false;

async function loadAudit() {
  try {
    const res = await fetch("/api/admin/audit", { credentials: "same-origin", cache: "no-store" });
    const data = (await res.json().catch(() => ({}))) as { entries?: AuditEntry[] };
    if (res.ok) auditEntries = data.entries ?? [];
  } catch {
    /* keep what is shown */
  }
  auditLoaded = true;
  auditListeners.forEach((l) => l());
}
auditWritten.add(() => {
  if (auditListeners.size) void loadAudit();
});

/** The audit log, newest first. Loads when a page that shows it opens, and again after anything is recorded. */
export function useAudit(): AuditEntry[] {
  const list = useSyncExternalStore(
    (l) => {
      auditListeners.add(l);
      return () => auditListeners.delete(l);
    },
    () => auditEntries,
    () => NO_ENTRIES,
  );
  useEffect(() => {
    void loadAudit();
  }, []);
  return list;
}
export const auditReady = () => auditLoaded;

/* ---------- organizer applications and organizers, from the server ---------- */

export type OrganizerRow = OrganizerApp & { documents: { title: string; detail: string; url?: string }[] };
type OrgState = { list: OrganizerRow[]; loaded: boolean; error?: string };
let orgState: OrgState = { list: [], loaded: false };
const ORG_SERVER: OrgState = { list: [], loaded: false };
const orgListeners = new Set<() => void>();
let orgLoading: Promise<void> | null = null;

/** Asks the server for the applications and organizers again. */
export function refreshOrganizers(): Promise<void> {
  orgLoading ??= fetch("/api/admin/organizers", { credentials: "same-origin", cache: "no-store" })
    .then(async (res) => {
      const data = (await res.json().catch(() => ({}))) as { rows?: OrganizerRow[]; error?: string };
      orgState = res.ok ? { list: data.rows ?? [], loaded: true } : { ...orgState, loaded: true, error: data.error ?? "Couldn't load organizers." };
    })
    .catch(() => {
      orgState = { ...orgState, loaded: true, error: "We couldn't reach SL Events." };
    })
    .finally(() => {
      orgLoading = null;
      orgListeners.forEach((l) => l());
    });
  return orgLoading;
}

/**
 * Every organizer application and organizer. Decisions are made on the server, which tells the applicant on their
 * status page, creates the organizer on approval and records it in the audit log.
 */
export function useApplications() {
  const snapshot = useSyncExternalStore(
    (l) => {
      orgListeners.add(l);
      return () => orgListeners.delete(l);
    },
    () => orgState,
    () => ORG_SERVER,
  );
  useEffect(() => {
    if (!orgState.loaded) void refreshOrganizers();
  }, []);

  async function decide(app: OrganizerApp, status: AppStatus, reason: string): Promise<{ ok: true; accountCreated?: boolean } | { ok: false; error: string }> {
    try {
      const res = await fetch(`/api/admin/organizers/${encodeURIComponent(app.id)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, note: reason }),
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; accountCreated?: boolean };
      await refreshOrganizers();
      return res.ok ? { ok: true, accountCreated: data.accountCreated } : { ok: false, error: data.error ?? "That didn't work. Try again." };
    } catch {
      return { ok: false, error: "We couldn't reach SL Events." };
    }
  }
  return { applications: snapshot.list, loaded: snapshot.loaded, error: snapshot.error, decide };
}

export const statusLabel: Record<AppStatus, string> = {
  new: "Waiting for decision",
  info_asked: "Info asked",
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
};

/* ---------- events, from the server ---------- */

type EventsState = { list: AdminEvent[]; loaded: boolean; error?: string };
let eventsState: EventsState = { list: [], loaded: false };
const EVENTS_SERVER: EventsState = { list: [], loaded: false };
const eventListeners = new Set<() => void>();
let eventsLoading: Promise<void> | null = null;

/** Asks the server for every event again (after a decision, or when a page opens). */
export function refreshAdminEvents(): Promise<void> {
  eventsLoading ??= fetch("/api/admin/events", { credentials: "same-origin", cache: "no-store" })
    .then(async (res) => {
      const data = (await res.json().catch(() => ({}))) as { events?: AdminEvent[]; error?: string };
      eventsState = res.ok ? { list: data.events ?? [], loaded: true } : { ...eventsState, loaded: true, error: data.error ?? "Couldn't load events." };
    })
    .catch(() => {
      eventsState = { ...eventsState, loaded: true, error: "We couldn't reach SL Events." };
    })
    .finally(() => {
      eventsLoading = null;
      eventListeners.forEach((l) => l());
    });
  return eventsLoading;
}

/** Every event on the platform, as the server has it. */
export function useAdminEvents() {
  const state = useAdminState();
  const snapshot = useSyncExternalStore(
    (l) => {
      eventListeners.add(l);
      return () => eventListeners.delete(l);
    },
    () => eventsState,
    () => EVENTS_SERVER,
  );
  useEffect(() => {
    if (!eventsState.loaded) void refreshAdminEvents();
  }, []);
  return { events: snapshot.list, loaded: snapshot.loaded, error: snapshot.error, dismissed: state.reportsDismissed };
}

/** Carries out a decision on the server, then reloads the list. */
export async function decideEvent(id: string, decision: "approve" | "changes" | "unpublish" | "republish" | "cancel" | "rename", text = ""): Promise<{ ok: true; cancelledBookings?: number } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/admin/events/${encodeURIComponent(id)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision, text }),
      credentials: "same-origin",
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; cancelledBookings?: number };
    await refreshAdminEvents();
    return res.ok ? { ok: true, cancelledBookings: data.cancelledBookings } : { ok: false, error: data.error ?? "That didn't work. Try again." };
  } catch {
    return { ok: false, error: "We couldn't reach SL Events." };
  }
}

/** Staff and customers, with changed roles and deactivations applied. */
export function useAdminUsers() {
  const state = useAdminState();
  const users = useMemo<AdminUser[]>(
    () => [...state.invited, ...seedUsers].map((u) => ({ ...u, role: state.users[u.id]?.role ?? u.role, active: state.users[u.id]?.active ?? u.active })),
    [state.users, state.invited],
  );
  return { users, overrides: state.users };
}

/* ---------- payment proofs waiting, from the server ---------- */

let pendingPayments = 0;
const paymentListeners = new Set<() => void>();
let paymentsLoading: Promise<void> | null = null;
let paymentsLoaded = false;

/** Counts the payment screenshots waiting to be checked across every event (again). */
export function refreshPendingPayments(): Promise<void> {
  paymentsLoading ??= fetch("/api/payments/queue?all=1", { credentials: "same-origin", cache: "no-store" })
    .then(async (res) => {
      const data = (await res.json().catch(() => ({}))) as { items?: unknown[] };
      if (res.ok) pendingPayments = data.items?.length ?? 0;
    })
    .catch(() => undefined)
    .finally(() => {
      paymentsLoading = null;
      paymentsLoaded = true;
      paymentListeners.forEach((l) => l());
    });
  return paymentsLoading;
}

function usePendingPayments() {
  const n = useSyncExternalStore(
    (l) => {
      paymentListeners.add(l);
      return () => paymentListeners.delete(l);
    },
    () => pendingPayments,
    () => 0,
  );
  useEffect(() => {
    if (!paymentsLoaded) void refreshPendingPayments();
  }, []);
  return n;
}

/** What the sidebar badges show: work waiting for an admin. */
export function useAdminCounts() {
  const { applications } = useApplications();
  const { events } = useAdminEvents();
  const payments = usePendingPayments();
  return {
    organizers: applications.filter((a) => a.status === "new" || a.status === "info_asked").length,
    events: events.filter((e) => e.status === "review").length,
    payments,
  };
}

/* ---------- platform figures (dashboard and reports), from the server ---------- */

export type PlatformFigures = {
  totals: {
    ticketsSold: number;
    revenue: number;
    tickets30: number;
    revenue30: number;
    ticketsChangePct: number;
    revenueChangePct: number;
    users: number;
    newUsers30: number;
    paymentsWaiting: number;
    paymentsWaitingAmount: number;
    awaitingPayment: number;
    eventsLive: number;
    eventsInReview: number;
    applicationsOpen: number;
    organizers: number;
  };
  ticketsPerDay: { date: string; label: string; value: number }[];
  ticketsPerWeek: { label: string; tickets: number; revenue: number }[];
  events: { id: string; title: string; organizer: string; status: string; sold: number; revenue: number; checkedIn: number }[];
  organizers: { name: string; events: number; live: number; sold: number; revenue: number }[];
};

let figures: PlatformFigures | null = null;
const figureListeners = new Set<() => void>();

async function loadFigures() {
  try {
    const res = await fetch("/api/admin/figures", { credentials: "same-origin", cache: "no-store" });
    if (res.ok) figures = (await res.json()) as PlatformFigures;
  } catch {
    /* keep what is shown */
  }
  figureListeners.forEach((l) => l());
}

/** Real platform totals: tickets, money, people, events. Null until loaded. */
export function useFigures(): PlatformFigures | null {
  const value = useSyncExternalStore(
    (l) => {
      figureListeners.add(l);
      return () => figureListeners.delete(l);
    },
    () => figures,
    () => null,
  );
  useEffect(() => {
    void loadFigures();
  }, []);
  return value;
}
