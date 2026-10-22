"use client";

import { useState } from "react";
import { ArrowUpRight, Building2, Download, FileText, Lock, Percent, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { eventPerformance, organizerActivity, reportStats, seedEvents, ticketsPerWeek } from "@/lib/admin";
import { logAudit } from "@/lib/adminStore";
import { formatKrw } from "@/lib/format";
import { downloadCsv } from "@/components/organizer/ui";
import { AdminHeader, BarChart, Meter, Panel, Toast } from "./ui";

const ranges = [
  { id: "all", label: "1 Sep – 19 Oct 2026", factor: 1 },
  { id: "30", label: "Last 30 days", factor: 0.62 },
  { id: "7", label: "Last 7 days", factor: 0.2 },
];

/** Which organizer ran which event, for the organizer filter. */
const eventOwners: Record<string, string[]> = {
  "SL Events": ["Sri Lankan Cultural Festival", "Poson Dansala & Meetup", "Avurudu Night Seoul"],
  "Lanka Beats Korea": ["Sri Lankan Music Night"],
};

/** Reports and analytics. Figures scale with the date range and the organizer filter. Refunds don't exist on the platform, so they are not reported. */
export function ReportsPage() {
  const [range, setRange] = useState("all");
  const [organizer, setOrganizer] = useState("");
  const [toast, setToast] = useState<string>();

  const r = ranges.find((x) => x.id === range)!;
  const share = organizer ? (organizerActivity.find((o) => o.name === organizer) ? 0.4 : 0.2) : 1;
  const f = r.factor * share;
  const s = reportStats;
  const gross = Math.round((s.gross * f) / 1000) * 1000;
  const fees = Math.round((s.fees * f) / 1000) * 1000;
  const paidOut = Math.round((s.paidOut * f) / 1000) * 1000;
  const waiting = gross - fees - paidOut > 0 ? gross - fees - paidOut : Math.round((s.waiting * f) / 1000) * 1000;
  const bookings = Math.round(s.bookings * f);

  const week = ticketsPerWeek.map((w) => ({ ...w, value: Math.round(w.value * share) }));
  const events = eventPerformance.filter((e) => !organizer || (eventOwners[organizer] ?? []).includes(e.name));
  const organizers = organizerActivity.map((o) => o.name);

  function exportAll() {
    downloadCsv("platform-report.csv", [
      ["Report", r.label, organizer || "All organizers"],
      ["Gross ticket sales (KRW)", gross],
      ["Bookings", bookings],
      ["Platform fees earned (KRW)", fees],
      ["Paid out to organizers (KRW)", paidOut],
      ["Waiting to be paid out (KRW)", waiting],
      [],
      ["Event", "Sold", "Capacity", "Sales", "Checked in"],
      ...events.map((e) => [e.name, e.sold, e.capacity, e.sales, e.checkedIn]),
    ]);
    // TODO: the API records the export; exports with personal data need the Export permission.
    logAudit({ type: "export", action: "Exported platform report (CSV)", item: "report: platform" });
    setToast("Report downloaded. The export is recorded in the audit log.");
    setTimeout(() => setToast(undefined), 3200);
  }

  const kpis = [
    { label: "Gross ticket sales", value: formatKrw(gross), Icon: Wallet, note: `+${s.growth}% vs previous period`, up: true },
    { label: "Bookings", value: bookings.toLocaleString("en-US"), Icon: FileText, note: `${s.ticketsPerBooking} tickets per booking` },
    { label: "Platform fees earned", value: formatKrw(fees), Icon: Percent, note: s.feeNote, up: true },
    { label: "Active organizers", value: `${organizer ? 1 : s.activeOrganizers} of ${organizer ? 1 : s.totalOrganizers}`, Icon: Building2, note: "ran at least one event" },
  ];

  return (
    <>
      <AdminHeader
        section="Reports"
        title="Reports and analytics"
        actions={
          <>
            <Select aria-label="Date range" value={range} onChange={(e) => setRange(e.target.value)} className="h-11 rounded-xl border border-line bg-surface-2 px-3 text-[13px] text-text focus:border-gold focus:outline-none">
              {ranges.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.label}
                </option>
              ))}
            </Select>
            <Select aria-label="Organizer" value={organizer} onChange={(e) => setOrganizer(e.target.value)} className="h-11 rounded-xl border border-line bg-surface-2 px-3 text-[13px] text-text focus:border-gold focus:outline-none">
              <option value="">All organizers</option>
              {organizers.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </Select>
            <Button onClick={exportAll}>
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
            <p className="mt-3 truncate text-[22px] font-bold leading-none text-text sm:text-[26px]">{value}</p>
            <p className={`mt-2.5 flex items-center gap-1 text-[11px] ${up ? "text-success" : "text-dim"}`}>
              {up && <ArrowUpRight size={11} aria-hidden />}
              {note}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel className="p-5 sm:p-6" aria-label="Tickets sold per week">
          <h2 className="text-base font-bold text-text">Tickets sold per week</h2>
          <p className="mt-1 text-[11px] text-dim">{organizer || "All events"} · confirmed payments</p>
          <BarChart data={week} height={190} />
        </Panel>

        <Panel className="overflow-hidden" aria-label="Fee summary">
          <h2 className="p-5 pb-3 text-base font-bold text-text sm:p-6 sm:pb-3">Fee summary</h2>
          <dl className="border-t border-line text-[13px]">
            {[
              ["Gross ticket sales", formatKrw(gross), false],
              ["Platform fees (SL Events)", formatKrw(fees), true],
              ["Paid out to organizers", formatKrw(paidOut), false],
              ["Waiting to be paid out", formatKrw(waiting), false],
            ].map(([k, v, hot]) => (
              <div key={String(k)} className={`flex items-center justify-between gap-3 border-b border-line px-5 py-3.5 last:border-b-0 sm:px-6 ${hot ? "bg-gold/10" : ""}`}>
                <dt className={hot ? "font-bold text-gold" : "text-muted"}>{k}</dt>
                <dd className="font-bold text-text">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel className="overflow-hidden" aria-label="Event performance">
          <div className="flex items-center justify-between gap-3 p-5 pb-4 sm:p-6 sm:pb-4">
            <h2 className="text-base font-bold text-text">Event performance</h2>
            <button
              type="button"
              onClick={() => downloadCsv("event-performance.csv", [["Event", "Sold", "Capacity", "Sales", "Checked in"], ...events.map((e) => [e.name, e.sold, e.capacity, e.sales, e.checkedIn])])}
              className="flex items-center gap-1.5 text-xs text-muted hover:text-gold"
            >
              <Download size={13} aria-hidden /> CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[30rem] text-left text-[13px]">
              <thead className="bg-surface-2 text-[10px] uppercase tracking-wider text-dim">
                <tr>
                  {["Event", "Sold", "Sales", "Checked in"].map((h) => (
                    <th key={h} scope="col" className="px-5 py-3 font-bold first:pl-6">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.name} className="border-t border-line">
                    <td className="px-5 py-4 pl-6 font-bold text-text">{e.name}</td>
                    <td className="px-5 py-4">
                      <p className="mb-1.5 text-[11px] text-muted">
                        {e.sold} / {e.capacity}
                      </p>
                      <Meter value={e.sold} max={e.capacity} className="w-28" />
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 font-bold text-text">{e.sales}</td>
                    <td className="px-5 py-4 text-muted">{e.checkedIn}</td>
                  </tr>
                ))}
                {events.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-sm text-muted">
                      No events for this organizer.
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
              onClick={() => downloadCsv("organizer-activity.csv", [["Organizer", "Events", "Sales"], ...organizerActivity.map((o) => [o.name, o.events, o.sales])])}
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
                {organizerActivity.map((o) => (
                  <tr key={o.name} className="border-t border-line">
                    <td className="px-5 py-4 pl-6 font-bold text-text">{o.name}</td>
                    <td className="px-5 py-4 text-muted">{o.events}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-muted">{o.sales}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <p className="mt-4 flex items-center gap-2 text-[11px] text-dim">
        <Lock size={12} aria-hidden /> Exports include personal data only for people with the Export permission. Each export is recorded in the audit log.
        <span className="sr-only">{seedEvents.length} events in total.</span>
      </p>
      <Toast message={toast} />
    </>
  );
}
