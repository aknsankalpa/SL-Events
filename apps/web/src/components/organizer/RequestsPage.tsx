"use client";

import { useMemo, useState } from "react";
import { Ban, Check, CheckCircle2, Clock, HandCoins, Search, ShieldAlert, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/StatusBadge";
import { formatKrw } from "@/lib/format";
import { useOrganizerProfile } from "./useOrganizerProfile";
import {
  declineReasons,
  maxRefundable,
  policyFor,
  REFUND_WINDOW_DAYS,
  type RefundRequest,
  type RequestKind,
  type RequestStatus,
} from "@/lib/refunds";
import { Dialog, OrgPageHeader, Panel, StatCard } from "./ui";
import { useRefundRequests } from "./useRefundRequests";

type TabId = "pending" | RequestStatus | "all";

const tabs: { id: TabId; label: string }[] = [
  { id: "pending", label: "Waiting" },
  { id: "approved", label: "Approved" },
  { id: "declined", label: "Declined" },
  { id: "all", label: "All" },
];

const statusTone = { pending: "warning", approved: "success", declined: "danger" } as const;
const statusLabel = { pending: "Waiting", approved: "Approved", declined: "Declined" } as const;
const kindLabel: Record<RequestKind, string> = { refund: "Refund", cancellation: "Cancellation" };

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function RequestsPage() {
  const { requests, pending, approve, decline } = useRefundRequests();
  const { profile } = useOrganizerProfile();
  const approver = profile.fullName.split(" ")[0] ?? "Organizer";

  const [tab, setTab] = useState<TabId>("pending");
  const [kind, setKind] = useState<"all" | RequestKind>("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [dialog, setDialog] = useState<"approve" | "decline" | null>(null);

  const counts = useMemo(
    () => ({
      pending: requests.filter((r) => r.status === "pending").length,
      approved: requests.filter((r) => r.status === "approved").length,
      declined: requests.filter((r) => r.status === "declined").length,
      all: requests.length,
    }),
    [requests],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return requests.filter(
      (r) =>
        (tab === "all" || r.status === tab) &&
        (kind === "all" || r.kind === kind) &&
        (!q || `${r.id} ${r.bookingId} ${r.buyer} ${r.email} ${r.event}`.toLowerCase().includes(q)),
    );
  }, [requests, tab, kind, query]);

  // Show the first matching request on wide screens until the organizer picks another.
  const selected = requests.find((r) => r.id === openId) ?? visible[0] ?? null;

  const awaitingAmount = requests.filter((r) => r.status === "pending").reduce((n, r) => n + r.asked, 0);
  const refundedTotal = requests.filter((r) => r.status === "approved").reduce((n, r) => n + (r.decision?.amount ?? 0), 0);

  return (
    <>
      <OrgPageHeader
        crumbs={[{ label: "Requests" }]}
        title="Refund & cancellation requests"
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        <StatCard
          label="Waiting for you"
          value={pending}
          Icon={Clock}
          subTone={pending > 0 ? "warn" : "default"}
          sub={pending > 0 ? "Buyers are waiting for an answer" : "You're all caught up"}
        />
        <StatCard label="Amount in question" value={formatKrw(awaitingAmount)} Icon={HandCoins} sub="Across waiting requests" />
        <StatCard
          label="Refunded so far"
          value={formatKrw(refundedTotal)}
          Icon={Undo2}
          subTone="up"
          sub={`${counts.approved} approved`}
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Request status" className="-mx-1 flex max-w-full gap-1 overflow-x-auto px-1">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-bold transition-colors focus-visible:focus-ring ${
                  active ? "border-amber text-gold" : "border-transparent text-muted hover:text-text"
                }`}
              >
                {t.label}
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted">{counts[t.id]}</span>
              </button>
            );
          })}
        </div>
        <div className="flex w-full flex-wrap gap-3 sm:w-auto">
          <label className="relative block">
            <span className="sr-only">Request type</span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as typeof kind)}
              className="h-11 cursor-pointer appearance-none rounded-xl border border-line bg-surface pl-3 pr-9 text-[13px] text-text focus:border-gold focus:outline-none"
            >
              <option value="all">All types</option>
              <option value="refund">Refunds</option>
              <option value="cancellation">Cancellations</option>
            </select>
          </label>
          <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-surface px-3 focus-within:border-gold sm:w-60 sm:flex-none">
            <Search size={14} aria-hidden className="text-muted" />
            <span className="sr-only">Search requests</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search requests"
              className="w-full bg-transparent text-[13px] text-text placeholder:text-dim focus:outline-none"
            />
          </label>
        </div>
      </div>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[1fr_24rem]">
        <Panel className="overflow-hidden">
          {visible.length === 0 ? (
            <div className="p-10 text-center">
              <CheckCircle2 size={26} aria-hidden className="mx-auto text-success" />
              <p className="mt-4 text-base font-bold text-text">
                {tab === "pending" && !query && kind === "all" ? "Nothing is waiting" : "No requests match"}
              </p>
              <p className="mt-2 text-sm text-muted">
                {tab === "pending" && !query && kind === "all"
                  ? "New refund and cancellation requests from buyers show up here."
                  : "Try a different tab or clear the search."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {visible.map((r) => {
                const active = selected?.id === r.id;
                const policy = policyFor(r);
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      aria-current={active ? "true" : undefined}
                      onClick={() => {
                        setOpenId(r.id);
                        setSheet(true);
                      }}
                      className={`flex w-full flex-wrap items-start gap-x-4 gap-y-2 border-l-2 px-5 py-4 text-left transition-colors focus-visible:focus-ring ${
                        active ? "border-l-amber bg-gold/5" : "border-l-transparent hover:bg-surface-2/60"
                      }`}
                    >
                      <span className="min-w-0 flex-1 basis-56 leading-tight">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-[13px] font-bold text-text">{r.buyer}</span>
                          <Badge tone="neutral" className="normal-case">
                            {kindLabel[r.kind]}
                          </Badge>
                        </span>
                        <span className="mt-1.5 block truncate text-[11px] text-dim">
                          {r.id} · {r.bookingId} · {r.event}
                        </span>
                        <span className="mt-1.5 block text-[11px] text-muted">
                          {r.paid === 0 ? "Not paid yet" : `Asked for ${formatKrw(r.asked)} of ${formatKrw(r.paid)}`} · {fmtDate(r.requestedOn)}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-2">
                        <Badge tone={statusTone[r.status]}>{statusLabel[r.status]}</Badge>
                        {r.status === "pending" && (
                          <span className={`text-[11px] font-bold ${policy.withinWindow ? "text-success" : "text-amber"}`}>
                            {policy.withinWindow ? "Within refund window" : "Outside refund window"}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        {selected && (
          <div
            className={`${sheet ? "fixed inset-0 z-40 overflow-y-auto bg-page p-4 sm:p-6" : "hidden"} xl:sticky xl:top-6 xl:block xl:overflow-visible xl:bg-transparent xl:p-0`}
          >
            <RequestDetail
              r={selected}
              onClose={() => setSheet(false)}
              onApprove={() => setDialog("approve")}
              onDecline={() => setDialog("decline")}
            />
          </div>
        )}
      </div>

      {selected && (
        <>
          <ApproveDialog
            key={`a-${selected.id}-${dialog === "approve"}`}
            r={selected}
            open={dialog === "approve"}
            onClose={() => setDialog(null)}
            onConfirm={(amount, note) => {
              approve(selected.id, amount, note, approver);
              setDialog(null);
            }}
          />
          <DeclineDialog
            key={`d-${selected.id}-${dialog === "decline"}`}
            r={selected}
            open={dialog === "decline"}
            onClose={() => setDialog(null)}
            onConfirm={(reason, note) => {
              decline(selected.id, reason, note, approver);
              setDialog(null);
            }}
          />
        </>
      )}
    </>
  );
}

function RequestDetail({
  r,
  onClose,
  onApprove,
  onDecline,
}: {
  r: RefundRequest;
  onClose: () => void;
  onApprove: () => void;
  onDecline: () => void;
}) {
  const policy = policyFor(r);
  const max = maxRefundable(r);
  const anyUsed = r.tickets.some((t) => t.used);
  const isUnpaid = r.paid === 0;

  return (
    <Panel className="overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-line p-5">
        <div className="leading-tight">
          <p className="text-[11px] text-dim">{kindLabel[r.kind]} request</p>
          <p className="mt-1 font-mono text-base font-bold text-text">{r.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={statusTone[r.status]}>{statusLabel[r.status]}</Badge>
          <button type="button" aria-label="Close details" onClick={onClose} className="rounded-lg p-1.5 text-muted hover:text-text xl:hidden">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="space-y-6 p-5">
        <div className="leading-tight">
          <p className="text-sm font-bold text-text">{r.buyer}</p>
          <p className="mt-1 text-[11px] text-dim">{r.email}</p>
          <p className="mt-3 text-xs text-muted">
            {r.event} · {fmtDate(r.eventDate)} · booking <span className="font-mono">{r.bookingId}</span>
          </p>
        </div>

        <dl className="grid grid-cols-3 gap-3">
          <Fig label="Paid" value={isUnpaid ? "Not paid" : formatKrw(r.paid)} />
          <Fig label="Asking for" value={isUnpaid ? "—" : formatKrw(r.asked)} />
          <Fig label="Most you can return" value={isUnpaid ? "—" : formatKrw(max)} tone={max < r.asked ? "warn" : undefined} />
        </dl>

        {!isUnpaid && (
          <div
            className={`flex items-start gap-3 rounded-xl border p-3.5 text-xs leading-relaxed ${
              policy.withinWindow ? "border-success/30 bg-success/10 text-text" : "border-amber/40 bg-amber/10 text-text"
            }`}
          >
            {policy.withinWindow ? (
              <CheckCircle2 size={15} aria-hidden className="mt-0.5 shrink-0 text-success" />
            ) : (
              <ShieldAlert size={15} aria-hidden className="mt-0.5 shrink-0 text-amber" />
            )}
            <span>
              <strong>{policy.withinWindow ? "Inside the refund window." : "Outside the refund window."}</strong> Requested{" "}
              {policy.daysBefore} days before the event. Refunds are available until {REFUND_WINDOW_DAYS} days before.
            </span>
          </div>
        )}

        {anyUsed && (
          <p className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/10 p-3.5 text-xs leading-relaxed text-text">
            <Ban size={15} aria-hidden className="mt-0.5 shrink-0 text-danger" />
            Some tickets in this booking were already scanned at the door. Used tickets can&apos;t be refunded.
          </p>
        )}

        <section>
          <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-dim">Why they asked</h3>
          <blockquote className="rounded-lg border-l-2 border-amber bg-surface-2 px-4 py-3 text-[13px] italic leading-relaxed text-text">
            {r.reason}
          </blockquote>
        </section>

        <section>
          <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-dim">Tickets in this booking</h3>
          <ul className="space-y-2">
            {r.tickets.map((t, i) => (
              <li key={`${t.code}-${i}`} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-2 p-3">
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-[13px] font-bold text-text">
                    {t.holder} · {t.ticket}
                  </span>
                  <span className="mt-1 block font-mono text-[10px] text-dim">{t.code}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-xs font-bold text-text">{formatKrw(t.price)}</span>
                  {!isUnpaid && <Badge tone={t.used ? "danger" : "success"}>{t.used ? "Used" : "Unused"}</Badge>}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-dim">History</h3>
          <ol className="space-y-2.5 text-xs">
            {r.timeline.map((h, i) => (
              <li key={`${h.label}-${i}`} className="flex justify-between gap-3 text-muted">
                <span>{h.label}</span>
                <span className="shrink-0 text-dim">{h.at}</span>
              </li>
            ))}
          </ol>
        </section>

        {r.status === "pending" ? (
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={onApprove}>
              <Check size={15} aria-hidden /> {isUnpaid ? "Cancel booking" : "Approve"}
            </Button>
            <Button variant="outline" className="border-danger/60 text-danger hover:bg-danger/10" onClick={onDecline}>
              Decline
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-line bg-surface-2 p-4 text-xs leading-relaxed">
            <p className="font-bold text-text">
              {r.status === "approved"
                ? r.decision?.amount
                  ? `Approved · ${formatKrw(r.decision.amount)} returned`
                  : "Approved · booking cancelled"
                : `Declined · ${r.decision?.declineReason ?? ""}`}
            </p>
            {r.decision?.note && <p className="mt-2 text-muted">&ldquo;{r.decision.note}&rdquo;</p>}
            <p className="mt-2 text-dim">{r.decision?.at}</p>
          </div>
        )}
      </div>
    </Panel>
  );
}

function Fig({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div className="rounded-lg border border-line bg-surface-2 p-3">
      <dt className="text-[10px] leading-tight text-dim">{label}</dt>
      <dd className={`mt-1.5 text-[13px] font-bold ${tone === "warn" ? "text-amber" : "text-text"}`}>{value}</dd>
    </div>
  );
}

function ApproveDialog({
  r,
  open,
  onClose,
  onConfirm,
}: {
  r: RefundRequest;
  open: boolean;
  onClose: () => void;
  onConfirm: (amount: number, note: string) => void;
}) {
  const isUnpaid = r.paid === 0;
  const unused = r.tickets.map((t, i) => ({ t, i })).filter(({ t }) => !t.used);

  // Start with the tickets that add up to what the buyer asked for (never more than they can get back).
  const [picked, setPicked] = useState<number[]>(() => {
    const chosen: number[] = [];
    let sum = 0;
    for (const { t, i } of unused) {
      if (sum >= r.asked && chosen.length > 0) break;
      chosen.push(i);
      sum += t.price;
    }
    return chosen;
  });
  const [note, setNote] = useState("");

  const amount = picked.reduce((n, i) => n + r.tickets[i]!.price, 0);

  return (
    <Dialog open={open} onClose={onClose} title={isUnpaid ? "Cancel this booking?" : "Approve this refund"}>
      {isUnpaid ? (
        <p className="text-sm leading-relaxed text-muted">
          <strong className="text-text">{r.bookingId}</strong> hasn&apos;t been paid. Cancelling releases{" "}
          {r.tickets.length} held seats straight away and nothing is refunded.
        </p>
      ) : (
        <>
          <fieldset>
            <legend className="mb-3 text-xs font-bold text-muted">Tickets to cancel and refund</legend>
            <ul className="space-y-2">
              {r.tickets.map((t, i) => (
                <li key={`${t.code}-${i}`}>
                  <label
                    className={`flex items-center gap-3 rounded-lg border p-3 text-[13px] ${
                      t.used ? "cursor-not-allowed border-line opacity-50" : "cursor-pointer border-line hover:border-gold/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={t.used}
                      checked={picked.includes(i)}
                      onChange={(e) => setPicked((p) => (e.target.checked ? [...p, i] : p.filter((x) => x !== i)))}
                      className="checkbox-box size-[18px] shrink-0 cursor-pointer appearance-none rounded border border-line bg-surface-2 checked:border-amber checked:bg-amber disabled:cursor-not-allowed focus-visible:focus-ring"
                    />
                    <span className="min-w-0 flex-1 truncate text-text">
                      {t.holder} · {t.ticket}
                    </span>
                    <span className="shrink-0 font-bold text-text">{formatKrw(t.price)}</span>
                    {t.used && <span className="shrink-0 text-[10px] font-bold uppercase text-danger">Used</span>}
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
          <p className="mt-4 flex items-center justify-between rounded-lg bg-surface-2 px-4 py-3 text-sm">
            <span className="text-muted">Refund to buyer</span>
            <span className="text-base font-bold text-text">{formatKrw(amount)}</span>
          </p>
          <p className="mt-3 text-[11px] leading-relaxed text-dim">
            SL Events sends this to the buyer&apos;s refund account. The cancelled tickets stop working immediately.
          </p>
        </>
      )}

      <label htmlFor="approve-note" className="mb-2 mt-5 block text-xs font-bold text-muted">
        Message to the buyer (optional)
      </label>
      <textarea
        id="approve-note"
        rows={3}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full resize-none rounded-lg border border-line bg-surface-2 p-3 text-sm text-text placeholder:text-dim focus:border-gold focus:outline-none"
        placeholder="Sorry you can't make it. We hope to see you next time."
      />

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>
          Back
        </Button>
        <Button disabled={!isUnpaid && amount === 0} onClick={() => onConfirm(isUnpaid ? 0 : amount, note)}>
          {isUnpaid ? "Cancel booking" : `Approve ${formatKrw(amount)}`}
        </Button>
      </div>
    </Dialog>
  );
}

function DeclineDialog({
  r,
  open,
  onClose,
  onConfirm,
}: {
  r: RefundRequest;
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string, note: string) => void;
}) {
  const policy = policyFor(r);
  const anyUsed = r.tickets.some((t) => t.used);
  const suggested = anyUsed && r.tickets.every((t) => t.used) ? declineReasons[0]! : !policy.withinWindow ? declineReasons[1]! : "";

  const [reason, setReason] = useState(suggested);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();

  function submit() {
    if (!reason) return setError("Choose a reason so the buyer knows why.");
    if (reason.startsWith("Other") && !note.trim()) return setError("Add a short explanation for the buyer.");
    onConfirm(reason, note);
  }

  return (
    <Dialog open={open} onClose={onClose} title="Decline this request">
      <label htmlFor="decline-reason" className="mb-2 block text-xs font-bold text-muted">
        Reason
      </label>
      <select
        id="decline-reason"
        value={reason}
        onChange={(e) => {
          setReason(e.target.value);
          setError(undefined);
        }}
        className="h-12 w-full rounded-lg border border-line bg-surface-2 px-3 text-sm text-text focus:border-gold focus:outline-none"
      >
        <option value="">Choose a reason</option>
        {declineReasons.map((d) => (
          <option key={d}>{d}</option>
        ))}
      </select>

      <label htmlFor="decline-note" className="mb-2 mt-5 block text-xs font-bold text-muted">
        Message to the buyer
      </label>
      <textarea
        id="decline-note"
        rows={3}
        value={note}
        onChange={(e) => {
          setNote(e.target.value);
          setError(undefined);
        }}
        className="w-full resize-none rounded-lg border border-line bg-surface-2 p-3 text-sm text-text placeholder:text-dim focus:border-gold focus:outline-none"
        placeholder="Explain your decision in a sentence or two."
      />
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      <p className="mt-3 text-[11px] leading-relaxed text-dim">The buyer gets this by email and in their notifications.</p>

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>
          Back
        </Button>
        <Button variant="danger" onClick={submit}>
          Decline request
        </Button>
      </div>
    </Dialog>
  );
}
