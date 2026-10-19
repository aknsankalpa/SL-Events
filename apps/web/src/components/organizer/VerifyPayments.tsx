"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Check, CheckCircle2, Maximize2, ShieldCheck, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { bookingStore, staffActions } from "@/lib/bookingStore";
import type { Booking } from "@/lib/bookings";
import { formatKrw } from "@/lib/format";
import { rejectReasons, verifyQueue, type QueueItem } from "@/lib/organizer";
import { useOrganizer } from "./OrganizerContext";
import { OrgPageHeader, Panel } from "./ui";
import { Select } from "@/components/ui/Select";

type Sort = "oldest" | "newest" | "amount";

const sorts: { value: Sort; label: string }[] = [
  { value: "oldest", label: "Oldest first" },
  { value: "newest", label: "Newest first" },
  { value: "amount", label: "Highest amount" },
];

const VISIBLE = 5;

/** A customer's uploaded proof, shown to the organizer as a payment to check. */
const toQueueItem = (b: Booking): QueueItem => ({
  id: b.id,
  buyer: b.attendees[0] || b.ownerEmail,
  booking: b.id,
  amount: b.total,
  waited: "just now",
  tickets: b.lines.map((l) => `${l.qty} × ${l.ticketName}`).join(", "),
  event: b.eventTitle,
  file: b.proof?.fileName ?? "receipt",
  uploaded: b.proof?.uploadedAt ?? "just now",
  receiptDate: "—",
  senderName: (b.proof?.sender ?? "").toUpperCase(),
  transferTime: b.proof?.bank ? `Sent from ${b.proof.bank}` : "Within the 24-hour hold",
});

export function VerifyPayments() {
  const { pending, resolveOnePending } = useOrganizer();
  const [queue, setQueue] = useState<QueueItem[]>(verifyQueue);
  // Proofs that customers sent from this browser join the queue. Approving one here is the only way a booking becomes paid.
  const stored = useSyncExternalStore(bookingStore.subscribe, bookingStore.getSnapshot, bookingStore.getServerSnapshot);
  const live = useMemo(
    () => stored.filter((b) => b.status === "under_review" && b.proof && !queue.some((q) => q.id === b.id)).map(toQueueItem),
    [stored, queue],
  );
  const all = useMemo(() => [...live, ...queue], [live, queue]);
  const [sort, setSort] = useState<Sort>("oldest");
  const [selectedId, setSelectedId] = useState(verifyQueue[0]!.id);
  const [toast, setToast] = useState<string>();

  const ordered = useMemo(() => {
    const list = [...all];
    if (sort === "newest") list.reverse();
    if (sort === "amount") list.sort((a, b) => b.amount - a.amount);
    return list;
  }, [all, sort]);

  const selected = all.find((q) => q.id === selectedId) ?? ordered[0];

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(undefined), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  function resolve(item: QueueItem, message: string) {
    const rest = ordered.filter((q) => q.id !== item.id);
    setQueue((q) => q.filter((x) => x.id !== item.id));
    setSelectedId(rest[0]?.id ?? "");
    resolveOnePending();
    setToast(message);
  }

  const more = Math.max(0, pending + live.length - Math.min(all.length, VISIBLE));

  return (
    <>
      <OrgPageHeader
        crumbs={[{ label: "All events", href: "/organizer/events" }, { label: "Verify payments" }]}
        title="Verify payments"
        actions={
          <p className="flex items-center gap-2 text-xs text-muted">
            <span className="size-2 rounded-full bg-amber" aria-hidden />
            {pending + live.length} waiting · oldest {all[0]?.waited.replace(" ago", "") ?? "—"}
          </p>
        }
      />

      {toast && (
        <p role="status" className="mb-4 flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm text-text">
          <CheckCircle2 size={16} aria-hidden className="text-success" /> {toast}
        </p>
      )}

      {!selected ? (
        <Panel className="p-10 text-center">
          <CheckCircle2 size={28} className="mx-auto text-success" aria-hidden />
          <p className="mt-3 text-base font-bold text-text">All caught up</p>
          <p className="mt-1 text-sm text-muted">There are no payments waiting for review.</p>
        </Panel>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[19rem_1fr_19.5rem] 2xl:grid-cols-[21rem_1fr_21rem]">
          {/* Queue */}
          <Panel className="flex flex-col overflow-hidden xl:max-h-[calc(100vh-9rem)]">
            <div className="flex items-center justify-between gap-3 border-b border-line p-4">
              <h2 className="text-base font-bold text-text">Waiting</h2>
              <label className="relative">
                <span className="sr-only">Sort the queue</span>
                <Select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as Sort)}
                  className="h-9 rounded-lg border border-line bg-surface-2 pl-3 pr-3 text-xs font-bold text-text focus:border-gold focus:outline-none"
                >
                  {sorts.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
            <ul className="flex-1 overflow-y-auto">
              {ordered.slice(0, VISIBLE).map((q) => {
                const active = q.id === selected.id;
                return (
                  <li key={q.id}>
                    <button
                      type="button"
                      aria-current={active ? "true" : undefined}
                      onClick={() => setSelectedId(q.id)}
                      className={`flex w-full items-center gap-3 border-b border-l-2 border-b-line px-4 py-3 text-left transition-colors focus-visible:focus-ring ${
                        active ? "border-l-amber bg-gold/10" : "border-l-transparent hover:bg-surface-2"
                      }`}
                    >
                      <ReceiptThumb />
                      <span className="min-w-0 flex-1 leading-tight">
                        <span className="block truncate text-[13px] font-bold text-text">{q.buyer}</span>
                        <span className="mt-1 block text-[11px] text-dim">{q.booking}</span>
                      </span>
                      <span className="text-right leading-tight">
                        <span className="block text-[13px] font-bold text-text">{formatKrw(q.amount)}</span>
                        <span className={`mt-1 block text-[11px] ${q.late ? "text-danger" : "text-dim"}`}>{q.waited}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {more > 0 && <p className="border-t border-line p-4 text-center text-xs font-bold text-amber">Show {more} more</p>}
          </Panel>

          <ReviewPane
            key={selected.id}
            item={selected}
            onApprove={() => {
              // TODO: the API records who verified the payment. For a customer's booking this issues the QR tickets.
              staffActions.confirmPayment(selected.booking, "Organizer payments team");
              resolve(selected, `Approved ${selected.booking}. Tickets are being sent to ${selected.buyer}.`);
            }}
            onReject={(reason) => {
              staffActions.rejectProof(selected.booking, reason);
              resolve(selected, `Rejected ${selected.booking}. ${selected.buyer} will be asked for a new screenshot.`);
            }}
          />
        </div>
      )}
    </>
  );
}

/** Receipt viewer and decision form. Keyed by booking so each receipt starts from a clean form and zoom. */
function ReviewPane({ item, onApprove, onReject }: { item: QueueItem; onApprove: () => void; onReject: (reason: string) => void }) {
  const [checked, setChecked] = useState(false);
  const [reason, setReason] = useState("");
  const [zoom, setZoom] = useState(1);

  return (
    <>
      {/* Receipt viewer */}
      <Panel className="flex min-h-[26rem] flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line p-4">
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[13px] font-bold text-text">{item.file}</p>
            <p className="mt-1 text-[11px] text-dim">Uploaded {item.uploaded}</p>
          </div>
          <div className="flex gap-2">
            <IconButton label="Zoom out" onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.2).toFixed(1)))}>
              <ZoomOut size={16} />
            </IconButton>
            <IconButton label="Zoom in" onClick={() => setZoom((z) => Math.min(2, +(z + 0.2).toFixed(1)))}>
              <ZoomIn size={16} />
            </IconButton>
            <IconButton label="Reset zoom" onClick={() => setZoom(1)}>
              <Maximize2 size={16} />
            </IconButton>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center overflow-auto bg-black/40 p-6">
          <div style={{ transform: `scale(${zoom})` }} className="origin-center transition-transform">
            <Receipt item={item} />
          </div>
        </div>
      </Panel>

      {/* Checks + decision */}
      <div className="space-y-5">
        <Panel className="p-5">
          <h2 className="text-base font-bold text-text">{item.buyer}</h2>
          <p className="mt-1 text-[11px] text-dim">
            {item.booking} · {item.tickets} · {item.event}
          </p>
          <ul className="mt-4 space-y-3">
            <Check4 label="Amount" value={formatKrw(item.amount)} note={`Booking: ${formatKrw(item.amount)}`} />
            <Check4 label="Memo" value={item.booking} />
            <Check4 label="Sender name" value={item.senderName} note={`Booking: ${item.buyer}`} />
            <Check4 label="Transfer time" value={item.transferTime} />
          </ul>
          <p className="mt-4 flex items-center gap-2 text-[11px] text-dim">
            <ShieldCheck size={13} aria-hidden className="text-success" /> This screenshot hasn&apos;t been used for another booking.
          </p>
        </Panel>

        <section className="rounded-xl border border-gold/40 bg-surface p-5" aria-label="Decision">
          <label className="flex cursor-pointer items-start gap-3 text-[13px] text-text">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="checkbox-box mt-0.5 size-[18px] shrink-0 cursor-pointer appearance-none rounded border border-line bg-surface-2 checked:border-amber checked:bg-amber focus-visible:focus-ring"
            />
            I checked our bank account and {formatKrw(item.amount)} arrived.
          </label>
          <Button
            size="lg"
            className="mt-4 w-full"
            disabled={!checked}
            onClick={onApprove}
          >
            <Check size={16} aria-hidden /> Approve and send tickets
          </Button>

          <div className="my-4 flex items-center gap-3 text-[11px] text-dim">
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
          </div>

          <label htmlFor="reject-reason" className="mb-2 block text-xs font-bold text-muted">
            Reject reason
          </label>
          <div className="relative">
            <Select
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-11 w-full rounded-lg border border-line bg-surface-2 px-3 text-sm text-text focus:border-gold focus:outline-none"
            >
              <option value="">Choose a reason</option>
              {rejectReasons.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </Select>
          </div>
          <Button
            variant="outline"
            size="lg"
            disabled={!reason}
            onClick={() => onReject(reason)}
            className="mt-3 w-full border-danger/60 text-danger hover:bg-danger/10"
          >
            Reject and ask for new proof
          </Button>
        </section>
      </div>
    </>
  );
}

function Check4({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <li className="flex items-start justify-between gap-3 rounded-lg border border-line bg-surface-2 p-3">
      <div className="min-w-0 leading-tight">
        <p className="text-[11px] text-dim">{label}</p>
        <p className="mt-1 text-[13px] font-bold text-text">{value}</p>
        {note && <p className="mt-1 text-[11px] text-dim">{note}</p>}
      </div>
      <CheckCircle2 size={16} aria-label="Matches" className="mt-1 shrink-0 text-success" />
    </li>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-9 items-center justify-center rounded-lg border border-line text-text transition-colors hover:border-gold/50 focus-visible:focus-ring"
    >
      {children}
    </button>
  );
}

function ReceiptThumb() {
  return (
    <span aria-hidden className="h-10 w-12 shrink-0 rounded bg-slate-100 p-1">
      <span className="mb-1 block h-1 w-6 rounded bg-blue-500" />
      <span className="mb-0.5 block h-0.5 w-full rounded bg-slate-300" />
      <span className="block h-0.5 w-3/4 rounded bg-slate-300" />
    </span>
  );
}

/** Stand-in for the customer's uploaded screenshot, drawn from the booking data. */
function Receipt({ item }: { item: QueueItem }) {
  const rows = [
    ["To", "SL Events"],
    ["Bank", "KB Kookmin"],
    ["Memo", item.booking],
    ["Date", item.receiptDate],
  ];
  return (
    <div className="w-[17.5rem] rounded-2xl bg-slate-50 p-6 text-slate-500 shadow-2xl">
      <span className="mb-1 block h-1.5 w-24 rounded bg-blue-500" />
      <div className="mt-5 flex flex-col items-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-blue-500 text-white">
          <Check size={22} strokeWidth={3} aria-hidden />
        </span>
        <p className="mt-4 text-3xl font-bold text-slate-900">{formatKrw(item.amount)}</p>
        <p className="mt-2 text-xs font-bold text-slate-500">Transfer complete</p>
      </div>
      <dl className="mt-6 border-t border-slate-200 pt-3">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between py-1.5 text-xs">
            <dt>{k}</dt>
            <dd className="font-bold text-slate-900">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
