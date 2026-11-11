"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, Building2, Download, FileText, Info, Lock, Percent, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { logAudit } from "@/lib/adminStore";
import { formatKrw } from "@/lib/format";
import { downloadCsv } from "@/components/organizer/ui";
import { AdminHeader, BarChart, Meter, Panel, Toast } from "./ui";
import { useAdminEvents, useFigures } from "./useAdmin";

/**
 * Reports from real bookings: paid tickets and money per week, per event and per organizer. Only verified payments
 * count. Refunds don't exist on the platform, so they are not reported.
 */
export function ReportsPage() {
  const figures = useFigures();
  const { events: adminEvents } = useAdminEvents();
  const [organizer, setOrganizer] = useState("");
  const [toast, setToast] = useState<string>();

  const capacityOf = useMemo(() => new Map(adminEvents.map((e) => [e.id, e.capacity])), [adminEvents]);
  const events = (figures?.events ?? []).filter((e) => !organizer || e.organizer === organizer);
  const organizers = (figures?.organizers ?? []).filter((o) => !organizer || o.name === organizer);
  const gross = events.reduce((n, e) => n + e.revenue, 0);
  const sold = events.reduce((n, e) => n + e.sold, 0);
  const active = organizers.filter((o) => o.sold > 0).length;
  const t = figures?.totals;
  const week = (figures?.ticketsPerWeek ?? []).map((w) => ({ label: w.label, value: w.tickets }));

  function exportAll() {
    downloadCsv("platform-report.csv", [
      ["Report", "All time", organizer || "All organizers"],
      ["Paid ticket sales (KRW)", gross],
      ["Paid tickets", sold],
      ["Platform fees earned (KRW)", 0],
      [],
      ["Event", "Organizer", "Status", "Paid tickets", "Capacity", "Sales (KRW)", "Checked in"],
      ...events.map((e) => [e.title, e.organizer, e.status, e.sold, capacityOf.get(e.id) ?? "", e.revenue, e.checkedIn]),
    ]);
    logAudit({ type: "export", action: "Exported platform report (CSV)", item: "report: platform" });
    setToast("Report downloaded. The export is recorded in the audit log.");
    setTimeout(() => setToast(undefined), 3200);
  }

  const kpis = [
    {
      label: "Paid ticket sales",
      value: formatKrw(gross),
      Icon: Wallet,
      note: organizer ? "All time" : `${formatKrw(t?.revenue30 ?? 0)} in the last 30 days`,
      up: !organizer && (t?.revenueChangePct ?? 0) > 0,
    },
    { label: "Paid tickets", value: sold.toLocaleString("en-US"), Icon: FileText, note: organizer ? "All time" : `${(t?.tickets30 ?? 0).toLocaleString("en-US")} in the last 30 days` },
    { label: "Platform fees earned", value: formatKrw(0), Icon: Percent, note: "No booking fee is charged at the moment" },
    { label: "Organizers with sales", value: `${active} of ${organizers.length}`, Icon: Building2, note: "sold at least one paid ticket" },
  ];

  return (
    <>
      <AdminHeader
        section="Reports"
        title="Reports and analytics"
        actions={
          <>
            <Select aria-label="Organizer" value={organizer} onChange={(e) => setOrganizer(e.target.value)} className="h-11 rounded-xl border border-line bg-surface-2 px-3 text-[13px] text-text focus:border-gold focus:outline-none">
              <option value="">All organizers</option>
              {(figures?.organizers ?? []).map((o) => (
                <option key={o.name} value={o.name}>
                  {o.name}
                </option>
              ))}
            </Select>
            <Button onClick={exportAll} disabled={!figures}>
              <Download size={16} aria-hidden /> Export
            </Button>
          </>
        }
      />

      <ul className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {kpis.map(({ label, value, Icon, note, up }) => (
          <li key={label} className="min-w-0 rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] font-bold leading-tight text-muted">{label}</p>
              <Icon size={14} aria-hidden className="shrink-0 text-dim" />
            </div>
            <p className="mt-3 truncate text-[22px] font-bold leading-none text-text sm:text-[26px]">{figures ? value : "…"}</p>
            <p className={`mt-2.5 flex items-center gap-1 text-[11px] ${up ? "text-success" : "text-dim"}`}>
              {up && <ArrowUpRight size={11} aria-hidden />}
              {note}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel className="p-5 sm:p-6" aria-label="Paid tickets per week">
          <h2 className="text-base font-bold text-text">Paid tickets per week</h2>
          <p className="mt-1 text-[11px] text-dim">All events · verified payments · last 12 weeks</p>
          <BarChart data={week} height={190} />
        </Panel>

        <Panel className="overflow-hidden" aria-label="Money summary">
          <h2 className="p-5 pb-3 text-base font-bold text-text sm:p-6 sm:pb-3">Money summary</h2>
          <dl className="border-t border-line text-[13px]">
            {[
              ["Paid ticket sales", formatKrw(gross), false],
              ["Platform fees (SL Events)", formatKrw(0), true],
              ["Waiting for payment checks", formatKrw(organizer ? 0 : (t?.paymentsWaitingAmount ?? 0)), false],
            ].map(([k, v, hot]) => (
              <div key={String(k)} className={`flex items-center justify-between gap-3 border-b border-line px-5 py-3.5 last:border-b-0 sm:px-6 ${hot ? "bg-gold/10" : ""}`}>
                <dt className={hot ? "font-bold text-gold" : "text-muted"}>{k}</dt>
                <dd className="font-bold text-text">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="flex items-start gap-2 border-t border-line px-5 py-3 text-[11px] leading-relaxed text-dim sm:px-6">
            <Info size={12} aria-hidden className="mt-0.5 shrink-0" /> Payouts to organizers aren&apos;t tracked in SL Events yet.
          </p>
        </Panel>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel className="overflow-hidden" aria-label="Event performance">
          <div className="flex items-center justify-between gap-3 p-5 pb-4 sm:p-6 sm:pb-4">
            <h2 className="text-base font-bold text-text">Event performance</h2>
            <button
              type="button"
              onClick={() =>
                downloadCsv("event-performance.csv", [
                  ["Event", "Organizer", "Paid tickets", "Capacity", "Sales (KRW)", "Checked in"],
                  ...events.map((e) => [e.title, e.organizer, e.sold, capacityOf.get(e.id) ?? "", e.revenue, e.checkedIn]),
                ])
              }
              className="flex items-center gap-1.5 text-xs text-muted hover:text-gold"
            >
              <Download size={13} aria-hidden /> CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[30rem] text-left text-[13px]">
              <thead className="bg-surface-2 text-[10px] uppercase tracking-wider text-dim">
                <tr>
                  {["Event", "Paid tickets", "Sales", "Checked in"].map((h) => (
                    <th key={h} scope="col" className="px-5 py-3 font-bold first:pl-6">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((e) => {
                  const cap = capacityOf.get(e.id) ?? 0;
                  return (
                    <tr key={e.id} className="border-t border-line">
                      <td className="px-5 py-4 pl-6">
                        <p className="font-bold text-text">{e.title}</p>
                        <p className="mt-0.5 text-[11px] text-dim">{e.organizer}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="mb-1.5 text-[11px] text-muted">
                          {e.sold}
                          {cap ? ` / ${cap}` : ""}
                        </p>
                        {cap > 0 && <Meter value={e.sold} max={cap} className="w-28" />}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 font-bold text-text">{e.revenue ? formatKrw(e.revenue) : "—"}</td>
                      <td className="px-5 py-4 text-muted">{e.sold ? `${e.checkedIn} of ${e.sold}` : "—"}</td>
                    </tr>
                  );
                })}
                {events.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-sm text-muted">
                      {figures ? "No events for this organizer." : "Loading…"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel className="overflow-hidden" aria-label="Organizer activity">
          <div className="flex items-center justify-between gap-3 p-5 pb-4 sm:p-6 sm:pb-4">
            <h2 className="text-base font-bold text-text">Organizer activity</h2>
            <button
              type="button"
              onClick={() =>
                downloadCsv("organizer-activity.csv", [["Organizer", "Events", "Live", "Paid tickets", "Sales (KRW)"], ...organizers.map((o) => [o.name, o.events, o.live, o.sold, o.revenue])])
              }
              className="flex items-center gap-1.5 text-xs text-muted hover:text-gold"
            >
              <Download size={13} aria-hidden /> CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[22rem] text-left text-[13px]">
              <thead className="bg-surface-2 text-[10px] uppercase tracking-wider text-dim">
                <tr>
                  {["Organizer", "Events", "Sales"].map((h) => (
                    <th key={h} scope="col" className="px-5 py-3 font-bold first:pl-6">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {organizers.map((o) => (
                  <tr key={o.name} className="border-t border-line">
                    <td className="px-5 py-4 pl-6 font-bold text-text">{o.name}</td>
                    <td className="px-5 py-4 text-muted">
                      {o.events}
                      {o.live ? ` · ${o.live} live` : ""}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-muted">{o.revenue ? formatKrw(o.revenue) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <p className="mt-4 flex items-center gap-2 text-[11px] text-dim">
        <Lock size={12} aria-hidden /> Each export is recorded in the audit log.
      </p>
      <Toast message={toast} />
    </>
  );
}
