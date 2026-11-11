"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, CheckCircle2, ExternalLink, FileText, Loader2, Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { formatKrw } from "@/lib/format";
import { rejectReasons } from "@/lib/organizer";
import type { ReviewItem } from "@/server/staff";
import { useOrganizer } from "./OrganizerContext";
import { OrgPageHeader, Panel } from "./ui";

type Sort = "oldest" | "newest" | "amount";

const sorts: { value: Sort; label: string }[] = [
  { value: "oldest", label: "Oldest first" },
  { value: "newest", label: "Newest first" },
  { value: "amount", label: "Highest amount" },
];

const VISIBLE = 8;
/** A proof waiting longer than this is shown in red: customers expect an answer within 2–6 hours. */
const LATE_MS = 6 * 3600_000;

function waited(iso: string, now: number) {
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  return hours < 48 ? `${hours} h ago` : `${Math.round(hours / 24)} days ago`;
}

const digits = (v?: string) => (v ?? "").replace(/\D/g, "");
const sameName = (a?: string, b?: string) => !!a && !!b && a.replace(/\s+/g, " ").trim().toLowerCase() === b.replace(/\s+/g, " ").trim().toLowerCase();

/** Organizer page: payments for the organizer's own events. */
export function VerifyPayments() {
  const { resolveOnePending } = useOrganizer();
  return <PaymentReview scope="organizer" onResolved={resolveOnePending} />;
}

/**
 * The queue of payment screenshots waiting to be checked, the screenshot itself and the decision. Organizers see their
 * own events; admins (`scope="admin"`) see every event. Approving here is the only way a paid booking gets tickets.
 */
export function PaymentReview({ scope, onResolved, embedded }: { scope: "organizer" | "admin"; onResolved?: () => void; embedded?: boolean }) {
  const [items, setItems] = useState<ReviewItem[] | null>(null);
  const [loadError, setLoadError] = useState<string>();
  const [sort, setSort] = useState<Sort>("oldest");
  const [selectedRef, setSelectedRef] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [toast, setToast] = useState<string>();
  const [now, setNow] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/payments/queue${scope === "admin" ? "?all=1" : ""}`, { credentials: "same-origin", cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as { items?: ReviewItem[]; error?: string };
      if (!res.ok) return setLoadError(data.error ?? "Couldn't load the payments.");
      setItems(data.items ?? []);
      setNow(Date.now());
    } catch {
      setLoadError("We couldn't reach SL Events.");
    }
  }, [scope]);

  useEffect(() => {
    // Loading the queue is the effect's whole job; its state arrives asynchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const id = setInterval(() => void load(), 60_000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(undefined), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  const ordered = useMemo(() => {
    const list = [...(items ?? [])];
    if (sort === "newest") list.reverse();
    if (sort === "amount") list.sort((a, b) => b.total - a.total);
    return list;
  }, [items, sort]);
  const selected = ordered.find((q) => q.ref === selectedRef) ?? ordered[0];
  const shown = showAll ? ordered : ordered.slice(0, VISIBLE);

  async function decide(item: ReviewItem, decision: "confirm" | "reject", reason = ""): Promise<string | undefined> {
    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(item.ref)}/review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision, reason }),
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        await load();
        return data.error ?? "That didn't work. Try again.";
      }
    } catch {
      return "We couldn't reach SL Events.";
    }
    const rest = ordered.filter((q) => q.ref !== item.ref);
    setItems((list) => (list ?? []).filter((q) => q.ref !== item.ref));
    setSelectedRef(rest[0]?.ref ?? "");
    onResolved?.();
    setToast(
      decision === "confirm"
        ? `Approved ${item.ref}. ${item.buyer}'s QR tickets are ready in their account.`
        : `Rejected ${item.ref}. ${item.buyer} can see why and send a new screenshot.`,
    );
    return undefined;
  }

  const oldest = ordered.length ? waited([...(items ?? [])][0]!.proof.uploadedIso, now).replace(" ago", "") : "—";

  return (
    <>
      {!embedded && (
        <OrgPageHeader
          crumbs={[{ label: "All events", href: "/organizer/events" }, { label: "Verify payments" }]}
          title="Verify payments"
          actions={
            <p className="flex items-center gap-2 text-xs text-muted">
              <span className="size-2 rounded-full bg-amber" aria-hidden />
              {items?.length ?? 0} waiting · oldest {oldest}
            </p>
          }
        />
      )}

      {toast && (
        <p role="status" className="mb-4 flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm text-text">
          <CheckCircle2 size={16} aria-hidden className="text-success" /> {toast}
        </p>
      )}

      {items === null ? (
        <Panel className="flex items-center justify-center gap-3 p-10 text-sm text-muted">
          {loadError ?? (
            <>
              <Loader2 size={16} aria-hidden className="animate-spin text-gold" /> Loading payments…
            </>
          )}
        </Panel>
      ) : !selected ? (
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
              <h2 className="text-base font-bold text-text">Waiting ({ordered.length})</h2>
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
              {shown.map((q) => {
                const active = q.ref === selected.ref;
                const late = now - new Date(q.proof.uploadedIso).getTime() > LATE_MS;
                return (
                  <li key={q.ref}>
                    <button
                      type="button"
                      aria-current={active ? "true" : undefined}
                      onClick={() => setSelectedRef(q.ref)}
                      className={`flex w-full items-center gap-3 border-b border-l-2 border-b-line px-4 py-3 text-left transition-colors focus-visible:focus-ring ${
                        active ? "border-l-amber bg-gold/10" : "border-l-transparent hover:bg-surface-2"
                      }`}
                    >
                      <ReceiptThumb pdf={q.proof.isPdf} />
                      <span className="min-w-0 flex-1 leading-tight">
                        <span className="block truncate text-[13px] font-bold text-text">{q.buyer}</span>
                        <span className="mt-1 block truncate text-[11px] text-dim">
                          {q.ref}
                          {scope === "admin" ? ` · ${q.eventTitle}` : ""}
                        </span>
                      </span>
                      <span className="text-right leading-tight">
                        <span className="block text-[13px] font-bold text-text">{formatKrw(q.total)}</span>
                        <span className={`mt-1 block text-[11px] ${late ? "text-danger" : "text-dim"}`}>{waited(q.proof.uploadedIso, now)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {ordered.length > VISIBLE && (
              <button type="button" onClick={() => setShowAll((v) => !v)} className="border-t border-line p-4 text-center text-xs font-bold text-amber hover:text-gold">
                {showAll ? "Show fewer" : `Show ${ordered.length - VISIBLE} more`}
              </button>
            )}
          </Panel>

          <ReviewPane key={selected.ref} item={selected} onApprove={() => decide(selected, "confirm")} onReject={(reason) => decide(selected, "reject", reason)} />
        </div>
      )}
    </>
  );
}

/** Receipt viewer and decision form. Keyed by booking so each receipt starts from a clean form and zoom. */
function ReviewPane({ item, onApprove, onReject }: { item: ReviewItem; onApprove: () => Promise<string | undefined>; onReject: (reason: string) => Promise<string | undefined> }) {
  const [checked, setChecked] = useState(false);
  const [reason, setReason] = useState("");
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [missing, setMissing] = useState(false);
  const src = `/api/bookings/${encodeURIComponent(item.ref)}/proof`;

  const run = async (action: () => Promise<string | undefined>) => {
    setBusy(true);
    setError(await action());
    setBusy(false);
  };

  const typedAmount = digits(item.proof.amount);
  const amountOk = typedAmount ? Number(typedAmount) === item.total : undefined;
  const nameOk = item.proof.sender ? sameName(item.proof.sender, item.buyer) : undefined;
  const when = [item.proof.date, item.proof.time].filter(Boolean).join(" ");

  return (
    <>
      {/* Receipt viewer */}
      <Panel className="flex min-h-[26rem] flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line p-4">
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[13px] font-bold text-text">{item.proof.fileName}</p>
            <p className="mt-1 text-[11px] text-dim">
              Uploaded {item.proof.uploadedAt} · {(item.proof.sizeBytes / 1024 / 1024).toFixed(1)} MB
            </p>
          </div>
          <div className="flex gap-2">
            {!item.proof.isPdf && (
              <>
                <IconButton label="Zoom out" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}>
                  <ZoomOut size={16} />
                </IconButton>
                <IconButton label="Zoom in" onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}>
                  <ZoomIn size={16} />
                </IconButton>
                <IconButton label="Reset zoom" onClick={() => setZoom(1)}>
                  <Maximize2 size={16} />
                </IconButton>
              </>
            )}
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              aria-label="Open the file in a new tab"
              className="flex size-9 items-center justify-center rounded-lg border border-line text-text transition-colors hover:border-gold/50 focus-visible:focus-ring"
            >
              <ExternalLink size={16} />
            </a>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center overflow-auto bg-black/40 p-6">
          {missing ? (
            <p className="max-w-xs text-center text-sm text-muted">
              The screenshot file isn&apos;t available. Ask the customer to send it again, or check the transfer in the bank account.
            </p>
          ) : item.proof.isPdf ? (
            <a href={src} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-3 text-sm font-bold text-amber hover:text-gold">
              <FileText size={40} aria-hidden />
              Open the PDF receipt
            </a>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- a private file served only to staff, not optimisable
            <img
              src={src}
              alt={`Payment screenshot for ${item.ref}`}
              onError={() => setMissing(true)}
              style={{ transform: `scale(${zoom})` }}
              className="max-h-[60vh] max-w-full origin-center rounded-lg object-contain shadow-2xl transition-transform"
            />
          )}
        </div>
      </Panel>

      {/* Checks + decision */}
      <div className="space-y-5">
        <Panel className="p-5">
          <h2 className="text-base font-bold text-text">{item.buyer}</h2>
          <p className="mt-1 text-[11px] text-dim">
            {item.ref} · {item.tickets}
            {item.seats ? ` · Seats ${item.seats}` : ""} · {item.eventTitle}
          </p>
          <ul className="mt-4 space-y-3">
            <Check4 label="Amount the customer says they sent" value={item.proof.amount || "Not given"} note={`Due: ${formatKrw(item.total)}`} ok={amountOk} />
            <Check4 label="Memo to look for" value={item.ref} note="Check the screenshot shows this booking number." />
            <Check4
              label="Sender name"
              value={item.proof.sender || "Not given"}
              note={nameOk === false ? `Booked by ${item.buyer}. It may be a friend's or family account.` : `Booked by ${item.buyer}`}
              ok={nameOk}
            />
            <Check4 label="Sent" value={when || "Not given"} note={item.proof.bank ? `From ${item.proof.bank}` : undefined} />
          </ul>
          {item.proof.note && (
            <p className="mt-4 rounded-lg border border-line bg-surface-2 p-3 text-[12px] text-muted">
              <strong className="text-text">Customer&apos;s note:</strong> {item.proof.note}
            </p>
          )}
          {item.rejectedBefore > 0 && (
            <p className="mt-4 flex items-center gap-2 text-[11px] text-amber">
              <AlertTriangle size={13} aria-hidden /> {item.rejectedBefore} earlier screenshot{item.rejectedBefore === 1 ? " was" : "s were"} rejected for this booking.
            </p>
          )}
        </Panel>

        <section className="rounded-xl border border-gold/40 bg-surface p-5" aria-label="Decision">
          <label className="flex cursor-pointer items-start gap-3 text-[13px] text-text">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="checkbox-box mt-0.5 size-[18px] shrink-0 cursor-pointer appearance-none rounded border border-line bg-surface-2 checked:border-amber checked:bg-amber focus-visible:focus-ring"
            />
            I checked our bank account and {formatKrw(item.total)} arrived.
          </label>
          <Button size="lg" className="mt-4 w-full" disabled={!checked || busy} onClick={() => void run(onApprove)}>
            <Check size={16} aria-hidden /> {busy ? "Saving…" : "Approve and issue tickets"}
          </Button>

          <div className="my-4 flex items-center gap-3 text-[11px] text-dim">
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
          </div>

          <label htmlFor="reject-reason" className="mb-2 block text-xs font-bold text-muted">
            Reject reason (the customer sees it)
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
            disabled={!reason || busy}
            onClick={() => void run(() => onReject(reason))}
            className="mt-3 w-full border-danger/60 text-danger hover:bg-danger/10"
          >
            Reject and ask for new proof
          </Button>
          {error && (
            <p role="alert" className="mt-3 text-xs font-bold text-danger">
              {error}
            </p>
          )}
        </section>
      </div>
    </>
  );
}

function Check4({ label, value, note, ok }: { label: string; value: string; note?: string; ok?: boolean }) {
  return (
    <li className="flex items-start justify-between gap-3 rounded-lg border border-line bg-surface-2 p-3">
      <div className="min-w-0 leading-tight">
        <p className="text-[11px] text-dim">{label}</p>
        <p className="mt-1 break-words text-[13px] font-bold text-text">{value}</p>
        {note && <p className="mt-1 text-[11px] text-dim">{note}</p>}
      </div>
      {ok === true && <CheckCircle2 size={16} aria-label="Matches" className="mt-1 shrink-0 text-success" />}
      {ok === false && <AlertTriangle size={16} aria-label="Doesn't match" className="mt-1 shrink-0 text-amber" />}
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

function ReceiptThumb({ pdf }: { pdf: boolean }) {
  return pdf ? (
    <span aria-hidden className="flex h-10 w-12 shrink-0 items-center justify-center rounded bg-slate-100 text-[9px] font-bold text-red-600">
      PDF
    </span>
  ) : (
    <span aria-hidden className="h-10 w-12 shrink-0 rounded bg-slate-100 p-1">
      <span className="mb-1 block h-1 w-6 rounded bg-blue-500" />
      <span className="mb-0.5 block h-0.5 w-full rounded bg-slate-300" />
      <span className="block h-0.5 w-3/4 rounded bg-slate-300" />
    </span>
  );
}
