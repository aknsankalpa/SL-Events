"use client";

import { useRef, useState } from "react";
import { AlertTriangle, ArrowUpRight, CheckCheck, Hourglass, Info, Link2, Lock, Upload, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/StatusBadge";
import { bankRows, failedPayments, gatewayPayments, type BankRow, type MatchState } from "@/lib/admin";
import { logAudit, updateAdmin } from "@/lib/adminStore";
import { staffActions } from "@/lib/bookingStore";
import { formatKrw } from "@/lib/format";
import { ADMIN } from "@/lib/admin";
import { AdminHeader, Panel, Tabs, Toast } from "./ui";
import { useAdminCounts, useAdminState } from "./useAdmin";

type Tab = "bank" | "gateway" | "failed";
type Filter = "all" | "action" | "matched";

const matchMeta: Record<MatchState, { label: string; tone: "success" | "warning" | "danger" }> = {
  matched: { label: "Matched", tone: "success" },
  differs: { label: "Amount differs", tone: "warning" },
  possible: { label: "Possible match", tone: "warning" },
  none: { label: "No match", tone: "danger" },
};

const bankRef = (row: BankRow) => `KB-20261019-${row.deposit.replace(/\D/g, "").padStart(4, "0")}-${String(row.amount / 10).slice(-4)}`;

export function PaymentsPage() {
  const state = useAdminState();
  const counts = useAdminCounts();
  const [tab, setTab] = useState<Tab>("bank");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState("b3");
  const [choice, setChoice] = useState<"waive" | "ask">("ask");
  const [reference, setReference] = useState("KB-20261019-0702-4471");
  const [note, setNote] = useState("Short by ₩5,000. Buyer asked to top up.");
  const [bookingNo, setBookingNo] = useState("");
  const [error, setError] = useState<string>();
  const [toast, setToast] = useState<string>();
  const fileInput = useRef<HTMLInputElement>(null);

  const rows = bankRows.filter((r) => (filter === "all" ? true : filter === "matched" ? r.match === "matched" : r.match !== "matched"));
  const selected = bankRows.find((r) => r.id === selectedId) ?? bankRows[0]!;
  const done = (r: BankRow) => state.bankDone[r.id];
  const needsAction = bankRows.filter((r) => r.match !== "matched" && !done(r)).length;
  const matchedOpen = bankRows.filter((r) => r.match === "matched" && !done(r)).length;

  const say = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(undefined), 3200);
  };

  /** Marks a deposit as handled. Confirming also tells the booking system, which is the only way a booking becomes paid. */
  function resolve(row: BankRow, kind: "confirmed" | "decided", action: string, ref: string, extra?: { label: string; from: string; to: string }[]) {
    // TODO: the API records this with the admin's identity and does the booking update in one step.
    if (kind === "confirmed" && row.booking) staffActions.confirmPayment(row.booking, `${ADMIN.name} · payments`);
    updateAdmin((s) => ({ ...s, bankDone: { ...s.bankDone, [row.id]: kind } }));
    logAudit({
      type: "payment",
      action,
      item: row.booking ?? "no booking",
      detail: {
        booking: `${row.booking ?? "No booking"} · ${row.sender} · ${formatKrw(row.amount)}`,
        bankRef: ref,
        changes: extra ?? (kind === "confirmed" ? [{ label: "Payment status", from: "Under review", to: "Paid" }] : undefined),
      },
    });
  }

  function confirmRow(row: BankRow) {
    resolve(row, "confirmed", `Confirmed bank transfer ${formatKrw(row.amount)}`, bankRef(row));
    say(`Confirmed ${row.booking}. Tickets are being sent.`);
  }

  function save() {
    const row = selected;
    if (done(row)) return;
    if (!reference.trim()) return setError("Add the bank reference from the statement.");
    setError(undefined);
    if (row.match === "differs") {
      if (choice === "waive") {
        resolve(row, "confirmed", `Confirmed ${formatKrw(row.amount)} and waived ${formatKrw((row.due ?? 0) - row.amount)}`, reference.trim());
        say(`Confirmed ${row.booking} and waived the difference.`);
      } else {
        resolve(row, "decided", `Asked buyer to send the rest for ${row.booking}`, reference.trim(), [{ label: "Note", from: "—", to: note.trim() || "Buyer asked to top up" }]);
        say("The buyer was emailed to send the rest.");
      }
    } else if (row.match === "possible") {
      resolve({ ...row, booking: "SL-41742" }, "confirmed", `Linked deposit to SL-41742 and confirmed ${formatKrw(row.amount)}`, reference.trim());
      say("Linked to SL-41742 and confirmed.");
    } else {
      if (!bookingNo.trim()) return setError("Enter the booking number to link this deposit to.");
      resolve({ ...row, booking: bookingNo.trim().toUpperCase() }, "confirmed", `Linked deposit to ${bookingNo.trim().toUpperCase()} and confirmed ${formatKrw(row.amount)}`, reference.trim());
      say(`Linked to ${bookingNo.trim().toUpperCase()} and confirmed.`);
    }
  }

  function importStatement(file?: File) {
    if (!file) return;
    // TODO: the API reads the bank file and matches each deposit to a booking.
    logAudit({ type: "payment", action: `Imported bank statement ${file.name}`, item: "KB Kookmin ····7890" });
    say(`Imported ${file.name}. Deposits are matched to bookings automatically.`);
  }

  const kpis = [
    { label: "Waiting for confirmation", value: String(counts.payments), Icon: Hourglass, note: "₩540,000 · oldest 5 h", warn: true },
    { label: "Confirmed today", value: String(31 + Object.values(state.bankDone).filter((v) => v === "confirmed").length), Icon: CheckCheck, note: "₩1,240,000", up: true },
    { label: "Deposits with no booking", value: String(bankRows.filter((r) => r.match === "none" && !done(r)).length), Icon: Link2, note: "₩75,000 to investigate", warn: true },
    { label: "Failed payments (7 days)", value: String(failedPayments.length), Icon: XCircle, note: "3 card · 1 Toss Pay" },
  ];

  return (
    <>
      <AdminHeader
        section="Payments"
        title="Payments and reconciliation"
        actions={
          <>
            <Button variant="outline" className="border-line bg-surface text-text hover:bg-surface-2" onClick={() => fileInput.current?.click()}>
              <Upload size={16} aria-hidden /> Import bank statement
            </Button>
            <input ref={fileInput} type="file" accept=".csv,.xlsx,.xls" className="sr-only" aria-label="Bank statement file" onChange={(e) => importStatement(e.target.files?.[0])} />
          </>
        }
      />

      <ul className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {kpis.map(({ label, value, Icon, note, warn, up }) => (
          <li key={label} className="min-w-0 rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] font-bold leading-tight text-muted">{label}</p>
              <Icon size={14} aria-hidden className="shrink-0 text-dim" />
            </div>
            <p className="mt-3 text-[26px] font-bold leading-none text-text">{value}</p>
            <p className={`mt-2.5 flex items-center gap-1 text-[11px] ${warn ? "text-amber" : up ? "text-success" : "text-dim"}`}>
              {warn && <AlertTriangle size={11} aria-hidden />}
              {up && <ArrowUpRight size={11} aria-hidden />}
              {note}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <Tabs
          label="Payment groups"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "bank", label: "Bank transfers", count: counts.payments },
            { id: "gateway", label: "Card & gateway", count: 58 },
            { id: "failed", label: "Failed", count: failedPayments.length },
          ]}
        />
      </div>

      {tab === "bank" && (
        <div className="mt-6 grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
          <div>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-text">Bank statement · KB Kookmin ····7890</h2>
                <p className="mt-1 text-[11px] text-dim">Imported today, 6:00 PM · 18 deposits · matched to bookings automatically</p>
              </div>
              <div className="flex gap-2" role="group" aria-label="Show">
                {(
                  [
                    ["action", `Needs action ${needsAction}`],
                    ["matched", `Matched ${matchedOpen + 10}`],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={filter === id}
                    onClick={() => setFilter(filter === id ? "all" : id)}
                    className={`rounded-full border px-3.5 py-1.5 text-[11px] font-bold transition-colors focus-visible:focus-ring ${
                      filter === id ? "border-transparent bg-gradient-to-b from-gold to-amber text-ink" : id === "action" ? "border-amber/50 text-amber" : "border-line text-muted hover:text-text"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <Panel className="mt-4 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[44rem] text-left text-[13px]">
                  <thead className="border-b border-line text-[10px] uppercase tracking-wider text-dim">
                    <tr>
                      {["Deposit", "Sender", "Amount", "Memo", "Booking match"].map((h) => (
                        <th key={h} scope="col" className="px-4 py-3.5 font-bold first:pl-5">
                          {h}
                        </th>
                      ))}
                      <th scope="col" className="w-28">
                        <span className="sr-only">Action</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const handled = done(r);
                      const active = selected.id === r.id;
                      return (
                        <tr key={r.id} className={`border-b border-line last:border-b-0 ${active ? "bg-gold/10" : ""}`}>
                          <td className="whitespace-nowrap py-3.5 pl-5 pr-4 text-muted">{r.deposit}</td>
                          <td className="px-4 font-bold text-text">{r.sender}</td>
                          <td className="whitespace-nowrap px-4 font-bold text-text">{formatKrw(r.amount)}</td>
                          <td className="px-4 font-mono text-[11px] text-gold">{r.memo || <span className="text-dim">no memo</span>}</td>
                          <td className="px-4 py-3">
                            {handled ? (
                              <Badge tone="success">{handled === "confirmed" ? "Confirmed" : "Decision saved"}</Badge>
                            ) : (
                              <>
                                <Badge tone={matchMeta[r.match].tone}>{matchMeta[r.match].label}</Badge>
                                <p className="mt-1 text-[11px] text-dim">{r.note}</p>
                              </>
                            )}
                          </td>
                          <td className="px-4 pr-5 text-right">
                            {handled ? null : r.match === "matched" ? (
                              <Button size="sm" onClick={() => confirmRow(r)}>
                                Confirm
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-line text-text hover:bg-surface-2"
                                onClick={() => {
                                  setSelectedId(r.id);
                                  setError(undefined);
                                }}
                              >
                                {r.match === "none" ? "Find booking" : "Review"}
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
            <p className="mt-3 flex items-center gap-2 text-[11px] text-dim">
              <Info size={12} aria-hidden /> Only confirm when the money is in the bank statement. A screenshot alone is not enough.
            </p>
          </div>

          <div className="space-y-5">
            <Panel className="border-gold/40 p-5" aria-label="Record a confirmation">
              <h2 className="text-base font-bold text-text">Record a confirmation</h2>
              <p className="mt-1.5 text-[11px] leading-relaxed text-dim">
                {selected.sender} · {formatKrw(selected.amount)}
                {selected.booking ? ` for booking ${selected.booking}` : ""}
                {selected.due ? ` (${formatKrw(selected.due)})` : ""}
              </p>

              {done(selected) ? (
                <p role="status" className="mt-4 rounded-lg border border-success/40 bg-success/10 p-3 text-xs text-text">
                  Already handled. See the audit log for the details.
                </p>
              ) : (
                <>
                  {selected.match === "differs" && (
                    <ul className="mt-4 space-y-2.5" role="radiogroup" aria-label="What to do">
                      {(
                        [
                          ["waive", `Confirm anyway (waive ${formatKrw((selected.due ?? 0) - selected.amount)})`],
                          ["ask", "Ask buyer to send the rest"],
                        ] as const
                      ).map(([id, label]) => (
                        <li key={id}>
                          <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-[13px] font-bold text-text ${choice === id ? "border-gold/70 bg-gold/10" : "border-line"}`}>
                            <input type="radio" name="what" checked={choice === id} onChange={() => setChoice(id)} className="accent-[#e8a83a]" />
                            {label}
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                  {selected.match === "possible" && (
                    <p className="mt-4 rounded-lg border border-line bg-surface-2 p-3 text-[12px] leading-relaxed text-muted">{selected.note}. Saving links this deposit to that booking and confirms it.</p>
                  )}
                  {selected.match === "none" && (
                    <div className="mt-4">
                      <label htmlFor="link-booking" className="mb-2 block text-[11px] font-bold text-muted">
                        Booking number to link
                      </label>
                      <input id="link-booking" value={bookingNo} onChange={(e) => setBookingNo(e.target.value)} placeholder="SL-41700" className="h-11 w-full rounded-lg border border-line bg-surface-2 px-3 font-mono text-sm text-text focus:border-gold focus:outline-none" />
                    </div>
                  )}

                  <label htmlFor="bank-ref" className="mb-2 mt-4 block text-[11px] font-bold text-muted">
                    Bank reference
                  </label>
                  <input id="bank-ref" value={reference} onChange={(e) => setReference(e.target.value)} className="h-11 w-full rounded-lg border border-line bg-surface-2 px-3 font-mono text-sm text-text focus:border-gold focus:outline-none" />
                  <label htmlFor="bank-note" className="mb-2 mt-4 block text-[11px] font-bold text-muted">
                    Note
                  </label>
                  <textarea id="bank-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="w-full resize-none rounded-lg border border-line bg-surface-2 p-3 text-[13px] text-text focus:border-gold focus:outline-none" />
                  {error && <p className="mt-2 text-xs text-danger">{error}</p>}
                  <Button size="lg" className="mt-4 w-full" onClick={save}>
                    Save decision
                  </Button>
                </>
              )}
              <p className="mt-3 flex items-center gap-2 text-[11px] text-dim">
                <Lock size={12} aria-hidden /> Saved as: {ADMIN.name} · authorized
              </p>
            </Panel>

            <FailedList />
          </div>
        </div>
      )}

      {tab === "gateway" && (
        <Panel className="mt-6 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-[13px]">
              <thead className="border-b border-line text-[10px] uppercase tracking-wider text-dim">
                <tr>
                  {["When", "Customer", "Method", "Booking", "Amount", "Status"].map((h) => (
                    <th key={h} scope="col" className="px-4 py-3.5 font-bold first:pl-5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gatewayPayments.map((g) => (
                  <tr key={g.id} className="border-b border-line last:border-b-0">
                    <td className="py-3.5 pl-5 pr-4 text-muted">{g.when}</td>
                    <td className="px-4 font-bold text-text">{g.who}</td>
                    <td className="px-4 text-muted">{g.method}</td>
                    <td className="px-4 font-mono text-[11px] text-gold">{g.booking}</td>
                    <td className="px-4 font-bold text-text">{formatKrw(g.amount)}</td>
                    <td className="px-4">
                      <Badge tone="success">{g.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-line px-5 py-3 text-[11px] text-dim">The most recent 4 of 58 card and gateway payments. These are confirmed by the gateway, so they need no checking here.</p>
        </Panel>
      )}

      {tab === "failed" && (
        <div className="mt-6 max-w-xl">
          <FailedList />
        </div>
      )}
      <Toast message={toast} />
    </>
  );
}

function FailedList() {
  return (
    <Panel className="overflow-hidden" aria-label="Failed payments">
      <h2 className="px-5 pb-3 pt-5 text-base font-bold text-text">Failed payments</h2>
      <ul className="divide-y divide-line border-t border-line">
        {failedPayments.map((f) => (
          <li key={f.id} className="flex items-center gap-3 px-5 py-3.5">
            <XCircle size={14} aria-hidden className="shrink-0 text-danger" />
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block text-[13px] font-bold text-text">{f.reason}</span>
              <span className="mt-1 block text-[11px] text-dim">
                {f.who} · {formatKrw(f.amount)}
              </span>
            </span>
            <span className="shrink-0 text-[11px] text-dim">{f.when}</span>
          </li>
        ))}
      </ul>
      <p className="border-t border-line px-5 py-3 text-[11px] text-dim">Buyers were emailed a link to try again.</p>
    </Panel>
  );
}
