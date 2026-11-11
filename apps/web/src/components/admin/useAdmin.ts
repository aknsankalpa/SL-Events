"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import {
  seedApplications,
  seedApproved,
  seedRejected,
  seedSuspended,
  seedUsers,
  type AdminEvent,
  type AdminUser,
  type AppStatus,
  type OrganizerApp,
} from "@/lib/admin";
import { adminStore, auditStore, configStore, logAudit, updateAdmin } from "@/lib/adminStore";
import { applicationStore, type Application } from "@/lib/organizerApplications";

export const useAdminState = () => useSyncExternalStore(adminStore.subscribe, adminStore.getSnapshot, adminStore.getServerSnapshot);
export const useAdminConfig = () => useSyncExternalStore(configStore.subscribe, configStore.getSnapshot, configStore.getServerSnapshot);
export const useAudit = () => useSyncExternalStore(auditStore.subscribe, auditStore.getSnapshot, auditStore.getServerSnapshot);

/** An application sent through the public "Become an organizer" form, shaped like the admin's own. */
function fromPublic(a: Application): OrganizerApp {
  const status: AppStatus = a.status === "approved" ? "approved" : a.status === "declined" ? "rejected" : a.status === "more_info" ? "info_asked" : "new";
  return {
    id: `pub-${a.ref}`,
    publicRef: a.ref,
    name: a.organization,
    initials: a.organization.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join(""),
    contact: a.name,
    email: a.email,
    phone: a.contact || "Not given",
    city: "—",
    kind: a.kind,
    registration: "—",
    expectedEvents: "—",
    about: a.about,
    applied: `Applied ${new Date(a.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}`,
    ago: "via the website",
    status,
    documents: a.documents.map((d) => ({ title: d.name, detail: `${Math.max(1, Math.round(d.size / 1024))} KB · attached to the application` })),
    checks: ["Name looks genuine", "Email works", "Past events look genuine", "Contact details verified"],
  };
}

/** Every organizer application, with the admin's decisions applied. Decisions on website applications also reach the applicant. */
export function useApplications() {
  const state = useAdminState();
  const pub = useSyncExternalStore(applicationStore.subscribe, applicationStore.getSnapshot, applicationStore.getServerSnapshot);

  const applications = useMemo<OrganizerApp[]>(() => {
    const own = [...seedApplications, ...seedApproved, ...seedSuspended, ...seedRejected].map((a) => ({
      ...a,
      status: state.appStatus[a.id]?.status ?? a.status,
    }));
    return [...pub.map(fromPublic), ...own];
  }, [state.appStatus, pub]);

  function decide(app: OrganizerApp, status: AppStatus, reason: string, notify: boolean) {
    if (app.publicRef) {
      const map = { approved: "approved", info_asked: "more_info", rejected: "declined", new: "in_review", suspended: "declined" } as const;
      applicationStore.update((list) =>
        list.map((x) => (x.ref === app.publicRef ? { ...x, status: map[status], note: notify && reason ? reason : x.note } : x)),
      );
    } else {
      updateAdmin((s) => ({ ...s, appStatus: { ...s.appStatus, [app.id]: { status, reason } } }));
    }
    const verb = { approved: "Approved organizer", info_asked: "Asked for more information from", rejected: "Rejected organizer", suspended: "Suspended organizer", new: "Reopened" }[status];
    logAudit({
      type: "decision",
      action: `${verb} ${app.name}`,
      item: `org: ${app.id}`,
      detail: { changes: [{ label: "Status", from: statusLabel[app.status], to: statusLabel[status] }, ...(reason ? [{ label: "Reason", from: "—", to: reason }] : [])] },
    });
  }
  return { applications, decide };
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
