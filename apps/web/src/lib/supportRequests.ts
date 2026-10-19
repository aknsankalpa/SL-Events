import { createPersistedStore } from "./persistedStore";

/** Messages sent to support, so a customer can see what they asked and whether we've replied. Browser-only until the API exists. */
export type SupportRequest = {
  id: string;
  email: string;
  topic: string;
  /** Booking number the question is about, if any. */
  booking: string;
  message: string;
  createdAt: string;
  status: "open" | "answered";
  reply?: { at: string; text: string };
};

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown) => (typeof v === "string" ? v : "");

const seed: SupportRequest[] = [
  {
    id: "HELP-1042",
    email: "kasun@example.com",
    topic: "Booking & payment",
    booking: "SL-41698",
    message: "I sent ₩20,000 by mistake. Can I just send the other ₩5,000 now?",
    createdAt: "2026-10-12T10:20:00+09:00",
    status: "answered",
    reply: {
      at: "2026-10-12T13:05:00+09:00",
      text: "Yes. Send the remaining ₩5,000 to the same account with the same memo, then upload both screenshots from your booking.",
    },
  },
];

export const supportStore = createPersistedStore<SupportRequest[]>("sl-events:support-requests:v1", seed, (stored) =>
  Array.isArray(stored)
    ? stored
        .filter(isRecord)
        .filter((r) => str(r.id))
        .map((r) => ({
          id: str(r.id),
          email: str(r.email).toLowerCase(),
          topic: str(r.topic),
          booking: str(r.booking),
          message: str(r.message),
          createdAt: str(r.createdAt),
          status: r.status === "answered" ? ("answered" as const) : ("open" as const),
          reply: isRecord(r.reply) ? { at: str(r.reply.at), text: str(r.reply.text) } : undefined,
        }))
    : seed,
);

export function submitSupportRequest(input: { email: string; topic: string; booking: string; message: string }): SupportRequest {
  const taken = new Set(supportStore.getSnapshot().map((r) => r.id));
  let id = "";
  do id = `HELP-${1000 + Math.floor(Math.random() * 9000)}`;
  while (taken.has(id));
  const request: SupportRequest = { ...input, id, email: input.email.toLowerCase(), createdAt: new Date().toISOString(), status: "open" };
  supportStore.update((list) => [request, ...list]);
  return request;
}
