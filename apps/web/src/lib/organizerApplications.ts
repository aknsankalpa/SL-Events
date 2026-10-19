import { createPersistedStore } from "./persistedStore";

/**
 * Applications to become an organizer, kept in this browser until the API exists. The form asks for as little as
 * possible and nothing tied to a country: a name, an email, the group's name and what they plan to run.
 */
export type ApplicationStatus = "received" | "in_review" | "more_info" | "approved" | "declined";

export type Application = {
  ref: string;
  name: string;
  email: string;
  /** Phone or a messaging handle, written however the applicant likes. */
  contact: string;
  organization: string;
  kind: string;
  about: string;
  link: string;
  /** Names and sizes of attached files. The files themselves go to storage once the API exists. */
  documents: { name: string; size: number }[];
  status: ApplicationStatus;
  submittedAt: string;
  /** A message from the review team, shown for "more info" and "declined". */
  note?: string;
};

export const eventKinds = ["Concerts and music", "Sports", "Culture and community", "Food and drink", "Travel and trips", "Something else"];

export const statusMeta: Record<ApplicationStatus, { label: string; tone: "neutral" | "warning" | "success" | "danger"; summary: string }> = {
  received: {
    label: "Received",
    tone: "neutral",
    summary: "We have your application. A member of the team will start the review within 2 working days.",
  },
  in_review: { label: "In review", tone: "warning", summary: "A member of the team is reading your application now." },
  more_info: { label: "More information needed", tone: "warning", summary: "We need a little more from you before we can decide." },
  approved: { label: "Approved", tone: "success", summary: "You're approved. Log in with this email to open the organizer area." },
  declined: { label: "Not approved", tone: "danger", summary: "We can't approve this application right now." },
};

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown) => (typeof v === "string" ? v : "");

const seed: Application[] = [
  {
    ref: "ORG-2041",
    name: "Demo Applicant",
    email: "demo.review@example.com",
    contact: "",
    organization: "Harbour City Beats",
    kind: "Concerts and music",
    about: "Monthly live music nights with local bands.",
    link: "",
    documents: [],
    status: "in_review",
    submittedAt: "2026-10-16T09:30:00Z",
  },
  {
    ref: "ORG-2042",
    name: "Demo Organizer",
    email: "demo.approved@example.com",
    contact: "",
    organization: "Weekend Cricket Club",
    kind: "Sports",
    about: "Runs friendly cricket matches every weekend.",
    link: "",
    documents: [],
    status: "approved",
    submittedAt: "2026-10-09T12:00:00Z",
  },
  {
    ref: "ORG-2043",
    name: "Demo Reviewer",
    email: "demo.info@example.com",
    contact: "",
    organization: "Street Food Collective",
    kind: "Food and drink",
    about: "A pop-up market with six home cooks.",
    link: "",
    documents: [],
    status: "more_info",
    submittedAt: "2026-10-14T15:10:00Z",
    note: "Please send a link or photo of a past market, and tell us where the next one would be held.",
  },
];

export const applicationStore = createPersistedStore<Application[]>("sl-events:organizer-applications:v1", seed, (stored) => {
  if (!Array.isArray(stored)) return seed;
  return stored
    .filter(isRecord)
    .filter((a) => str(a.ref))
    .map((a) => ({
      ref: str(a.ref),
      name: str(a.name),
      email: str(a.email).toLowerCase(),
      contact: str(a.contact),
      organization: str(a.organization),
      kind: str(a.kind),
      about: str(a.about),
      link: str(a.link),
      documents: Array.isArray(a.documents)
        ? a.documents.filter(isRecord).map((d) => ({ name: str(d.name), size: typeof d.size === "number" ? d.size : 0 }))
        : [],
      status: (["received", "in_review", "more_info", "approved", "declined"] as const).find((s) => s === a.status) ?? "received",
      submittedAt: str(a.submittedAt) || new Date().toISOString(),
      note: str(a.note) || undefined,
    }));
});

export type NewApplication = Omit<Application, "ref" | "status" | "submittedAt" | "note">;

/** Saves a new application and returns its reference. */
export function submitApplication(input: NewApplication): Application {
  const taken = new Set(applicationStore.getSnapshot().map((a) => a.ref));
  let ref = "";
  do ref = `ORG-${1000 + Math.floor(Math.random() * 9000)}`;
  while (taken.has(ref));
  const application: Application = { ...input, email: input.email.toLowerCase(), ref, status: "received", submittedAt: new Date().toISOString() };
  applicationStore.update((list) => [application, ...list]);
  return application;
}

export function findApplication(ref: string, email: string): Application | undefined {
  const r = ref.trim().toUpperCase();
  const e = email.trim().toLowerCase();
  return applicationStore.getSnapshot().find((a) => a.ref === r && a.email === e);
}

/** An application from this email that is still waiting for a decision, if any. */
export function openApplicationFor(email: string): Application | undefined {
  const e = email.trim().toLowerCase();
  return applicationStore.getSnapshot().find((a) => a.email === e && ["received", "in_review", "more_info"].includes(a.status));
}
