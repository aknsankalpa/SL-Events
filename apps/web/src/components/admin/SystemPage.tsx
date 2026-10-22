"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Database, FileArchive, FileSpreadsheet, FileText, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Toggle } from "@/components/ui/Toggle";
import { Badge } from "@/components/ui/StatusBadge";
import { ADMIN, backups, connected, services } from "@/lib/admin";
import { logAudit, updateConfig, type Maintenance } from "@/lib/adminStore";
import { downloadCsv } from "@/components/organizer/ui";
import { AdminHeader, Dialog, Panel, Toast } from "./ui";
import { useAdminConfig } from "./useAdmin";

const DAYS = 30;

const steps = [
  "Check the status cards above. If a service is slow, wait a few minutes and look again.",
  "If payments or tickets look wrong, turn on maintenance mode so customers know to expect delays.",
  "Don't re-confirm payments to “fix” something. Every confirmation is permanent and the bookings page shows the real state.",
  "Still stuck? Contact technical support with what you saw and the time.",
];

/** Service health, backups, connected services and maintenance mode. Statuses are sample data until monitoring exists. */
export function SystemPage() {
  const config = useAdminConfig();
  const [draft, setDraft] = useState<Maintenance | null>(null);
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportText, setSupportText] = useState("");
  const [supportError, setSupportError] = useState<string>();
  const [toast, setToast] = useState<string>();

  const maintenance = draft ?? config.maintenance;
  const dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(config.maintenance);
  const slow = services.filter((s) => s.state === "slow");

  const say = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(undefined), 3200);
  };

  function saveMaintenance() {
    if (!draft) return;
    if (draft.on && !draft.message.trim()) return say("Write the message customers will see first.");
    // TODO: the API puts the whole site into maintenance mode; here the public site reads this saved value.
    updateConfig((c) => ({ ...c, maintenance: draft }));
    const m = config.maintenance;
    logAudit({
      type: "system",
      action: draft.on ? "Turned maintenance mode on" : "Turned maintenance mode off",
      item: "system: maintenance",
      detail: { changes: [{ label: "Maintenance mode", from: m.on ? "On" : "Off", to: draft.on ? "On" : "Off" }, ...(m.window !== draft.window ? [{ label: "Window", from: m.window, to: draft.window }] : [])] },
    });
    setDraft(null);
    say(draft.on ? "Maintenance mode is on. Customers see your message." : "Saved. The website is open as normal.");
  }

  function exportData(kind: "Excel" | "CSV" | "ZIP") {
    if (kind === "CSV") {
      downloadCsv("bookings-sample.csv", [
        ["Booking", "Customer", "Event", "Tickets", "Amount", "Status"],
        ["SL-41740", "Malith Ekanayake", "Sri Lankan Music Night", 2, 60000, "Paid"],
        ["SL-41742", "Kasun Perera", "Sri Lankan Music Night", 2, 60000, "Waiting for payment"],
      ]);
    }
    // TODO: the API builds the real export (this only downloads a small sample) and emails a link for the big ones.
    logAudit({ type: "export", action: `Exported all bookings (${kind})`, item: "report: bookings" });
    say(kind === "CSV" ? "Sample downloaded. The export is recorded in the audit log." : `${kind} export requested. We'll email a link to ${ADMIN.email}.`);
  }

  function sendSupport() {
    if (supportText.trim().length < 10) return setSupportError("Tell us a little more about what you saw.");
    setSupportOpen(false);
    setSupportText("");
    setSupportError(undefined);
    say("Sent. Technical support will reply by email.");
  }

  return (
    <>
      <AdminHeader
        section="System"
        title="System operations"
        actions={
          <Button variant="outline" onClick={() => setSupportOpen(true)}>
            <LifeBuoy size={16} aria-hidden /> Contact technical support
          </Button>
        }
      />

      <div role="status" className={`mb-5 flex items-start gap-3 rounded-xl border px-4 py-3 text-[13px] ${slow.length ? "border-amber/40 bg-amber/10 text-amber" : "border-success/30 bg-success/10 text-success"}`}>
        {slow.length ? <AlertTriangle size={16} aria-hidden className="mt-0.5 shrink-0" /> : <CheckCircle2 size={16} aria-hidden className="mt-0.5 shrink-0" />}
        {slow.length ? `Everything is working, but ${slow.map((s) => s.name.toLowerCase()).join(" and ")} ${slow.length > 1 ? "are" : "is"} slow right now. Emails may arrive a few minutes late.` : "Everything is working normally."}
      </div>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {services.map((sv) => (
          <li key={sv.id} className="min-w-0 rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-bold text-text">{sv.name}</h2>
                <p className="mt-1 truncate text-[11px] text-dim">{sv.sub}</p>
              </div>
              <Badge tone={sv.state === "working" ? "success" : "warning"} dot>
                {sv.state === "working" ? "Working" : "Slow"}
              </Badge>
            </div>
            <div aria-hidden className="mt-4 flex h-7 gap-[2px]">
              {Array.from({ length: DAYS }, (_, i) => (
                <span key={i} className={`flex-1 rounded-[2px] ${sv.slowDays.includes(i) ? "bg-amber" : "bg-success/70"}`} />
              ))}
            </div>
            <p className="mt-3 flex items-center justify-between text-[11px] text-dim">
              <span>30 days ago</span>
              <span className="font-bold text-muted">{sv.uptime} uptime</span>
              <span>Today</span>
            </p>
            {sv.slowDays.length > 0 && <p className="sr-only">Slow on {sv.slowDays.length} of the last 30 days.</p>}
          </li>
        ))}
      </ul>
      <p className="mt-3 flex flex-wrap gap-4 text-[11px] text-dim">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-sm bg-success/70" /> Working
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-sm bg-amber" /> Slow or partly down
        </span>
      </p>

      <div className="mt-5 grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <Panel className="p-5 sm:p-6" aria-label="Backups">
          <h2 className="flex items-center gap-2 text-base font-bold text-text">
            <Database size={16} aria-hidden className="text-gold" /> Backups
          </h2>
          <p className="mt-1 text-xs text-dim">A full copy is made automatically every night.</p>
          <ul className="mt-4 divide-y divide-line rounded-xl border border-line text-[13px]">
            {backups.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-text">
                  {b.when} {b.latest && <Badge tone="success" className="ml-2">Latest</Badge>}
                </span>
                <span className="text-dim">{b.size}</span>
              </li>
            ))}
          </ul>
          <h3 className="mb-3 mt-5 text-[10px] font-bold uppercase tracking-widest text-dim">Safe exports</h3>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => exportData("Excel")}>
              <FileSpreadsheet size={14} aria-hidden /> Excel
            </Button>
            <Button size="sm" variant="outline" onClick={() => exportData("CSV")}>
              <FileText size={14} aria-hidden /> CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => exportData("ZIP")}>
              <FileArchive size={14} aria-hidden /> ZIP
            </Button>
          </div>
          <p className="mt-3 text-[11px] text-dim">Exports contain personal data. Keep them private; each one is recorded in the audit log.</p>
        </Panel>

        <Panel className="p-5 sm:p-6" aria-label="Connected services">
          <h2 className="text-base font-bold text-text">Connected services</h2>
          <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
            {connected.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0 leading-tight">
                  <span className="block text-[13px] font-bold text-text">{c.name}</span>
                  <span className="mt-1 block truncate text-[11px] text-dim">{c.sub}</span>
                </span>
                <Badge tone={c.state === "connected" ? "success" : "warning"} dot>
                  {c.state === "connected" ? "Connected" : c.state === "slow" ? "Slow" : "Expires soon"}
                </Badge>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-5 grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <Panel className="p-5 sm:p-6" aria-label="Maintenance mode">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-text">Maintenance mode</h2>
              <p className="mt-1 text-xs text-dim">Shows customers a notice at the top of every page.</p>
            </div>
            <Toggle label="Maintenance mode" checked={maintenance.on} onChange={(on) => setDraft({ ...maintenance, on })} />
          </div>
          <div className="mt-5 space-y-4">
            <Field label="Scheduled window" value={maintenance.window} onChange={(e) => setDraft({ ...maintenance, window: e.target.value })} />
            <div>
              <label htmlFor="maintenance-message" className="mb-2 block text-xs font-bold text-muted">
                Message customers see
              </label>
              <textarea
                id="maintenance-message"
                rows={3}
                value={maintenance.message}
                onChange={(e) => setDraft({ ...maintenance, message: e.target.value })}
                className="w-full rounded-lg border border-line bg-surface px-4 py-3 text-sm text-text focus:border-gold focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <Button onClick={saveMaintenance} disabled={!dirty}>
              Save
            </Button>
            {dirty && (
              <button type="button" onClick={() => setDraft(null)} className="text-[13px] text-muted hover:text-text">
                Discard
              </button>
            )}
          </div>
        </Panel>

        <Panel className="p-5 sm:p-6" aria-label="If something goes wrong">
          <h2 className="text-base font-bold text-text">If something goes wrong</h2>
          <ol className="mt-4 space-y-3">
            {steps.map((t, i) => (
              <li key={t} className="flex items-start gap-3 text-[13px] leading-relaxed text-muted">
                <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-full border border-gold/60 text-[11px] font-bold text-gold">
                  {i + 1}
                </span>
                {t}
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      <Dialog open={supportOpen} onClose={() => setSupportOpen(false)} title="Contact technical support">
        <label htmlFor="support-text" className="mb-2 block text-xs font-bold text-muted">
          What happened?
        </label>
        <textarea
          id="support-text"
          rows={5}
          value={supportText}
          onChange={(e) => setSupportText(e.target.value)}
          placeholder="What you saw, which page, and roughly when."
          className="w-full rounded-lg border border-line bg-surface px-4 py-3 text-sm text-text placeholder:text-dim focus:border-gold focus:outline-none"
        />
        {supportError && (
          <p role="alert" className="mt-1.5 text-xs text-danger">
            {supportError}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setSupportOpen(false)}>
            Cancel
          </Button>
          <Button onClick={sendSupport}>Send</Button>
        </div>
      </Dialog>
      <Toast message={toast} />
    </>
  );
}
