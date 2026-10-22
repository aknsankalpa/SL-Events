"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowRight, Download, Lock, Search, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/StatusBadge";
import type { AuditEntry, AuditType } from "@/lib/admin";
import { logAudit } from "@/lib/adminStore";
import { downloadCsv } from "@/components/organizer/ui";
import { AdminHeader, Avatar, Panel, Toast } from "./ui";
import { useAudit } from "./useAdmin";

const typeLabels: Record<AuditType, string> = {
  payment: "Payment",
  permission: "Permission",
  decision: "Decision",
  settings: "Settings",
  account: "Account",
  content: "Content",
  export: "Export",
  system: "System",
};

const typeTone: Record<AuditType, "success" | "warning" | "neutral" | "danger"> = {
  payment: "success",
  permission: "warning",
  decision: "success",
  settings: "neutral",
  account: "danger",
  content: "neutral",
  export: "warning",
  system: "neutral",
};

const dateRanges = [
  { id: "any", label: "Any date", days: Infinity },
  { id: "7", label: "Last 7 days", days: 7 },
  { id: "30", label: "Last 30 days", days: 30 },
];

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Seoul" });
const whenLong = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true, timeZone: "Asia/Seoul" });

/** Read-only history of every admin action. Nothing on this page can edit or remove an entry. */
export function AuditPage() {
  const params = useSearchParams();
  const log = useAudit();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [type, setType] = useState<"" | AuditType>("");
  const [who, setWho] = useState("");
  const [range, setRange] = useState("any");
  const [selectedId, setSelectedId] = useState<string>();
  const [toast, setToast] = useState<string>();
  // Read once when the page opens, so the date filter stays steady while the list re-renders.
  const [now] = useState(() => Date.now());

  const people = useMemo(() => [...new Set(log.map((e) => e.who))], [log]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const days = dateRanges.find((r) => r.id === range)!.days;
    return log.filter((e) => {
      if (type && e.type !== type) return false;
      if (who && e.who !== who) return false;
      if (Number.isFinite(days) && now - new Date(e.at).getTime() > days * 86_400_000) return false;
      return !q || `${e.who} ${e.action} ${e.item} ${e.detail?.bankRef ?? ""} ${e.detail?.booking ?? ""}`.toLowerCase().includes(q);
    });
  }, [log, query, type, who, range, now]);

  const selected: AuditEntry | undefined = selectedId === "none" ? undefined : (log.find((e) => e.id === selectedId) ?? list[0]);

  function exportLog() {
    downloadCsv("audit-log.csv", [
      ["When", "Who", "Role", "What happened", "Item", "Type"],
      ...list.map((e) => [whenLong(e.at), e.who, e.role, e.action, e.item, typeLabels[e.type]]),
    ]);
    // The export itself is a loggable event: it appears at the top of the log after the download.
    logAudit({ type: "export", action: "Exported audit log (CSV)", item: "report: audit" });
    setToast("Log downloaded. The export is recorded.");
    setTimeout(() => setToast(undefined), 3200);
  }

  const selectClass = "h-11 rounded-xl border border-line bg-surface-2 px-3 text-[13px] text-text focus:border-gold focus:outline-none";

  return (
    <>
      <AdminHeader
        section="Audit log"
        title="Audit log"
        actions={
          <Button onClick={exportLog}>
            <Download size={16} aria-hidden /> Export log
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex h-11 w-full min-w-0 items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 focus-within:border-gold sm:w-80">
          <Search size={14} aria-hidden className="text-muted" />
          <span className="sr-only">Search the log</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search booking number, bank reference or name" className="h-full w-full bg-transparent text-[13px] text-text placeholder:text-dim focus:outline-none" />
        </label>
        <Select aria-label="Type" value={type} onChange={(e) => setType(e.target.value as "" | AuditType)} className={selectClass}>
          <option value="">All types</option>
          {(Object.keys(typeLabels) as AuditType[]).map((t) => (
            <option key={t} value={t}>
              {typeLabels[t]}
            </option>
          ))}
        </Select>
        <Select aria-label="Who" value={who} onChange={(e) => setWho(e.target.value)} className={selectClass}>
          <option value="">Everyone</option>
          {people.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
        <Select aria-label="Date" value={range} onChange={(e) => setRange(e.target.value)} className={selectClass}>
          {dateRanges.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="mt-6 grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <Panel className="overflow-hidden" aria-label="Log entries">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] text-left text-[13px]">
              <thead className="border-b border-line text-[10px] uppercase tracking-wider text-dim">
                <tr>
                  {["When", "Who", "What happened", "Item", "Type"].map((h) => (
                    <th key={h} scope="col" className="px-4 py-3.5 font-bold first:pl-5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((e) => {
                  const active = selected?.id === e.id;
                  return (
                    <tr key={e.id} onClick={() => setSelectedId(e.id)} className={`cursor-pointer border-b border-line last:border-b-0 ${active ? "bg-gold/10" : "hover:bg-surface-2/50"}`}>
                      <td className="whitespace-nowrap py-3.5 pl-5 pr-4 text-muted">
                        <button type="button" onClick={() => setSelectedId(e.id)} aria-current={active ? "true" : undefined} className="text-left focus-visible:focus-ring">
                          {when(e.at)}
                        </button>
                      </td>
                      <td className="px-4">
                        <span className="flex items-center gap-2.5">
                          <Avatar initials={e.initials} size={30} />
                          <span className="leading-tight">
                            <span className="block font-bold text-text">{e.who}</span>
                            <span className="mt-0.5 block text-[11px] text-dim">{e.role}</span>
                          </span>
                        </span>
                      </td>
                      <td className="px-4 text-text">{e.action}</td>
                      <td className="whitespace-nowrap px-4 font-mono text-[12px] text-muted">{e.item}</td>
                      <td className="px-4">
                        <Badge tone={typeTone[e.type]}>{typeLabels[e.type]}</Badge>
                      </td>
                    </tr>
                  );
                })}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted">
                      Nothing in the log matches those filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        {selected && (
          <Panel className="p-5" aria-label="Entry details">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-text">{selected.action}</h2>
                <p className="mt-1 text-[11px] text-dim">{whenLong(selected.at)} KST</p>
              </div>
              <button type="button" aria-label="Close details" onClick={() => setSelectedId("none")} className="rounded p-1 text-muted hover:text-text xl:hidden">
                <X size={16} />
              </button>
            </div>

            <dl className="mt-4 divide-y divide-line border-y border-line text-[13px]">
              {[
                ["Who", `${selected.who} · ${selected.role}`],
                ["Item", selected.item],
                ...(selected.detail?.booking ? [["Booking", selected.detail.booking]] : []),
                ...(selected.detail?.bankRef ? [["Bank reference", selected.detail.bankRef]] : []),
                ["Device", selected.detail?.device ?? "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-4 py-3">
                  <dt className="shrink-0 text-muted">{k}</dt>
                  <dd className={`min-w-0 break-words text-right text-text ${k === "Bank reference" || k === "Item" ? "font-mono text-[12px]" : ""}`}>{v}</dd>
                </div>
              ))}
            </dl>

            {selected.detail?.changes && selected.detail.changes.length > 0 && (
              <>
                <h3 className="mb-3 mt-5 text-[10px] font-bold uppercase tracking-widest text-dim">What changed</h3>
                <ul className="space-y-2">
                  {selected.detail.changes.map((c) => (
                    <li key={c.label} className="rounded-lg border border-line bg-surface-2 p-3 text-[12px]">
                      <p className="text-muted">{c.label}</p>
                      <p className="mt-1.5 flex flex-wrap items-center gap-2 font-bold text-text">
                        <span className="text-dim line-through decoration-dim/60">{c.from}</span>
                        <ArrowRight size={12} aria-hidden className="text-gold" />
                        <span>{c.to}</span>
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <p className="mt-5 flex items-start gap-2 rounded-lg border border-line bg-surface-2 p-3 text-[11px] leading-relaxed text-muted">
              <Lock size={12} aria-hidden className="mt-0.5 shrink-0 text-gold" /> Log entries can&apos;t be edited or deleted by anyone, including the owner.
            </p>
          </Panel>
        )}
      </div>
      <Toast message={toast} />
    </>
  );
}
