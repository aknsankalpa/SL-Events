"use client";

import { useMemo, useState } from "react";
import { Check, FileText, Lock, Search, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/StatusBadge";
import { organizerTabCounts, seedApproved, seedRejected, seedSuspended, type AppStatus } from "@/lib/admin";
import { AdminHeader, Avatar, Dialog, Panel, Tabs, Toast } from "./ui";
import { statusLabel, useApplications } from "./useAdmin";

type Tab = "applications" | "approved" | "suspended" | "rejected";
type Choice = "approved" | "info_asked" | "rejected";

const choices: { id: Choice; title: string; hint: string; button: string }[] = [
  { id: "approved", title: "Approve", hint: "They can publish events after review", button: "Approve organizer" },
  { id: "info_asked", title: "Ask for more information", hint: "Application stays open", button: "Send request" },
  { id: "rejected", title: "Reject", hint: "They can apply again after 30 days", button: "Reject application" },
];

const tabStatus: Record<Tab, AppStatus[]> = {
  applications: ["new", "info_asked"],
  approved: ["approved"],
  suspended: ["suspended"],
  rejected: ["rejected"],
};

export function OrganizersPage() {
  const { applications, decide } = useApplications();
  const [tab, setTab] = useState<Tab>("applications");
  const [selectedId, setSelectedId] = useState<string>("busan-lions");
  const [choice, setChoice] = useState<Choice>("approved");
  const [reason, setReason] = useState("ID, phone and bank checked. Past event photo looks fine.");
  const [notify, setNotify] = useState(true);
  const [reasonError, setReasonError] = useState<string>();
  const [checks, setChecks] = useState<Record<string, boolean[]>>({});
  const [viewing, setViewing] = useState<string | null>(null);
  const [toast, setToast] = useState<string>();
  const [query, setQuery] = useState("");

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return applications.filter((a) => tabStatus[tab].includes(a.status) && (!q || `${a.name} ${a.contact} ${a.email}`.toLowerCase().includes(q)));
  }, [applications, tab, query]);
  const selected = list.find((a) => a.id === selectedId) ?? list[0];

  const count = (t: Tab) => {
    const live = applications.filter((a) => tabStatus[t].includes(a.status)).length;
    if (t === "applications") return live;
    const seeded = { approved: seedApproved, suspended: seedSuspended, rejected: seedRejected }[t].length;
    return organizerTabCounts[t] - seeded + live;
  };

  const ticks = selected ? (checks[selected.id] ?? selected.checks.map((_, i) => i < selected.checks.length - 1)) : [];
  const open = selected?.status === "new" || selected?.status === "info_asked";
  const missing = ticks.filter((t) => !t).length;

  function say(message: string) {
    setToast(message);
    setTimeout(() => setToast(undefined), 3200);
  }

  function submit() {
    if (!selected) return;
    if (choice !== "approved" && !reason.trim()) {
      setReasonError(choice === "rejected" ? "Write the reason so it is saved with the decision." : "Say what you need from them.");
      return;
    }
    setReasonError(undefined);
    // TODO: the API saves the decision with the admin's name and time, and sends the email when asked.
    decide(selected, choice, reason.trim(), notify);
    say(
      choice === "approved"
        ? `${selected.name} is approved${notify ? " and has been emailed" : ""}.`
        : choice === "info_asked"
          ? `Asked ${selected.contact} for more information.`
          : `${selected.name} was rejected.`,
    );
    setSelectedId("");
    setReason("");
  }

  function change(status: AppStatus, label: string) {
    if (!selected) return;
    decide(selected, status, reason.trim(), false);
    say(label);
    setSelectedId("");
  }

  return (
    <>
      <AdminHeader
        section="Organizers"
        title="Organizer approval"
        actions={
          <label className="flex h-11 w-full items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 focus-within:border-gold sm:w-72">
            <Search size={14} aria-hidden className="text-muted" />
            <span className="sr-only">Search organizers</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search organizers" className="h-full w-full bg-transparent text-[13px] text-text placeholder:text-dim focus:outline-none" />
          </label>
        }
      />

      <Tabs
        label="Organizer groups"
        value={tab}
        onChange={(t) => {
          setTab(t);
          setSelectedId("");
        }}
        tabs={[
          { id: "applications", label: "Applications", count: count("applications") },
          { id: "approved", label: "Approved", count: count("approved") },
          { id: "suspended", label: "Suspended", count: count("suspended") },
          { id: "rejected", label: "Rejected", count: count("rejected") },
        ]}
      />

      {list.length === 0 || !selected ? (
        <Panel className="mt-6 p-10 text-center">
          <Check size={26} aria-hidden className="mx-auto text-success" />
          <p className="mt-3 text-base font-bold text-text">{tab === "applications" ? "All caught up" : "Nobody here"}</p>
          <p className="mt-1 text-sm text-muted">{tab === "applications" ? "No organizer applications are waiting." : "No organizers match."}</p>
        </Panel>
      ) : (
        <div className="mt-6 grid grid-cols-1 items-start gap-5 xl:grid-cols-[17rem_minmax(0,1fr)_18.5rem]">
          {/* applicant list: a row of scrolling cards on tablets, a column on desktop */}
          <Panel className="overflow-hidden" aria-label="Applicants">
            <ul className="flex overflow-x-auto xl:block xl:overflow-visible">
              {list.map((a) => {
                const active = a.id === selected.id;
                return (
                  <li key={a.id} className="min-w-[15rem] shrink-0 border-b border-r border-line last:border-r-0 xl:min-w-0 xl:border-r-0">
                    <button
                      type="button"
                      aria-current={active ? "true" : undefined}
                      onClick={() => setSelectedId(a.id)}
                      className={`flex w-full items-center gap-3 border-l-2 px-4 py-3.5 text-left transition-colors focus-visible:focus-ring ${
                        active ? "border-l-amber bg-gold/10" : "border-l-transparent hover:bg-surface-2"
                      }`}
                    >
                      <Avatar initials={a.initials} />
                      <span className="min-w-0 flex-1 leading-tight">
                        <span className="block truncate text-[13px] font-bold text-text">{a.name}</span>
                        <span className="mt-1 block truncate text-[11px] text-dim">
                          {a.contact} · {a.ago}
                        </span>
                      </span>
                      {a.status === "new" && <Badge tone="warning">New</Badge>}
                      {a.status === "info_asked" && <Badge>Info asked</Badge>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <div className="space-y-5">
            <Panel className="p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <Avatar initials={selected.initials} size={52} />
                <div className="min-w-0">
                  <h2 className="font-display text-[24px] font-bold leading-tight text-text">{selected.name}</h2>
                  <p className="mt-1 text-xs text-dim">
                    {selected.applied} · {selected.kind}
                  </p>
                  <Badge tone={selected.status === "approved" ? "success" : selected.status === "new" || selected.status === "info_asked" ? "warning" : "danger"} dot className="mt-2.5">
                    {statusLabel[selected.status]}
                  </Badge>
                </div>
              </div>
              <dl className="mt-5 grid gap-x-6 gap-y-4 border-t border-line pt-5 text-[13px] sm:grid-cols-2">
                {[
                  ["Contact person", selected.contact],
                  ["Email", selected.email],
                  ["Phone", selected.phone],
                  ["City", selected.city],
                  ["Business registration", selected.registration],
                  ["Expected events", selected.expectedEvents],
                ].map(([k, v]) => (
                  <div key={k} className="min-w-0">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-dim">{k}</dt>
                    <dd className="mt-1 break-words font-bold text-text">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-dim">About their events</p>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">{selected.about}</p>
              </div>
            </Panel>

            {selected.documents.length > 0 && (
              <Panel className="p-5 sm:p-6">
                <h2 className="text-base font-bold text-text">Documents submitted</h2>
                <ul className="mt-4 space-y-3">
                  {selected.documents.map((d) => (
                    <li key={d.title} className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold">
                        <FileText size={16} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1 leading-tight">
                        <span className="block truncate text-[13px] font-bold text-text">{d.title}</span>
                        <span className="mt-1 block truncate text-[11px] text-dim">{d.detail}</span>
                      </span>
                      <button type="button" onClick={() => setViewing(d.title)} className="shrink-0 text-xs font-bold text-amber hover:text-gold">
                        View
                      </button>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            {selected.checks.length > 0 && (
              <Panel className="p-5 sm:p-6">
                <h2 className="text-base font-bold text-text">Your checks</h2>
                <ul className="mt-4 space-y-3">
                  {selected.checks.map((c, i) => (
                    <li key={c}>
                      <label className="flex cursor-pointer items-center gap-3 text-[13px] text-text">
                        <input
                          type="checkbox"
                          checked={ticks[i] ?? false}
                          onChange={(e) => setChecks((cur) => ({ ...cur, [selected.id]: ticks.map((t, j) => (j === i ? e.target.checked : t)) }))}
                          className="checkbox-box size-[18px] shrink-0 cursor-pointer appearance-none rounded border border-line bg-surface-2 checked:border-amber checked:bg-amber focus-visible:focus-ring"
                        />
                        {c}
                      </label>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </div>

          <Panel className="border-gold/40 p-5 xl:sticky xl:top-6" aria-label="Your decision">
            {open ? (
              <>
                <h2 className="text-base font-bold text-text">Your decision</h2>
                <ul className="mt-4 space-y-2.5" role="radiogroup" aria-label="Decision">
                  {choices.map((c) => (
                    <li key={c.id}>
                      <label
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${
                          choice === c.id ? "border-gold/70 bg-gold/10" : "border-line hover:border-gold/40"
                        }`}
                      >
                        <input type="radio" name="decision" checked={choice === c.id} onChange={() => setChoice(c.id)} className="mt-0.5 accent-[#e8a83a]" />
                        <span className="leading-tight">
                          <span className="block text-[13px] font-bold text-text">{c.title}</span>
                          <span className="mt-1 block text-[11px] text-dim">{c.hint}</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>

                <label htmlFor="decision-reason" className="mb-2 mt-4 block text-[11px] font-bold text-muted">
                  Reason (saved with the decision)
                </label>
                <textarea
                  id="decision-reason"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  aria-invalid={reasonError ? true : undefined}
                  className={`w-full resize-none rounded-lg border bg-surface-2 p-3 text-[13px] text-text focus:border-gold focus:outline-none ${reasonError ? "border-danger" : "border-line"}`}
                />
                {reasonError && <p className="mt-1.5 text-xs text-danger">{reasonError}</p>}

                <label className="mt-3 flex cursor-pointer items-center gap-3 text-[13px] text-text">
                  <input
                    type="checkbox"
                    checked={notify}
                    onChange={(e) => setNotify(e.target.checked)}
                    className="checkbox-box size-[18px] shrink-0 cursor-pointer appearance-none rounded border border-line bg-surface-2 checked:border-amber checked:bg-amber focus-visible:focus-ring"
                  />
                  Email the applicant
                </label>
                {choice === "approved" && missing > 0 && (
                  <p className="mt-3 text-[11px] text-amber">
                    {missing} check{missing === 1 ? " isn't" : "s aren't"} ticked yet.
                  </p>
                )}
                <Button size="lg" className="mt-4 w-full" onClick={submit}>
                  <Check size={16} aria-hidden /> {choices.find((c) => c.id === choice)!.button}
                </Button>
                <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-dim">
                  <Lock size={12} aria-hidden className="mt-0.5 shrink-0" /> Every decision here is saved in the audit log with your name and the time.
                </p>
              </>
            ) : selected.status === "approved" ? (
              <>
                <h2 className="text-base font-bold text-text">Suspend this organizer</h2>
                <p className="mt-2 text-[12px] leading-relaxed text-muted">Suspending hides their events and stops new sales. Existing tickets stay valid.</p>
                <label htmlFor="suspend-reason" className="mb-2 mt-4 block text-[11px] font-bold text-muted">
                  Reason (saved with the decision)
                </label>
                <textarea id="suspend-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className="w-full resize-none rounded-lg border border-line bg-surface-2 p-3 text-[13px] text-text focus:border-gold focus:outline-none" />
                {reasonError && <p className="mt-1.5 text-xs text-danger">{reasonError}</p>}
                <Button
                  variant="outline"
                  className="mt-4 w-full border-danger/60 text-danger hover:bg-danger/10"
                  onClick={() => (reason.trim() ? change("suspended", `${selected.name} is suspended.`) : setReasonError("Write the reason first."))}
                >
                  <ShieldOff size={16} aria-hidden /> Suspend organizer
                </Button>
              </>
            ) : (
              <>
                <h2 className="text-base font-bold text-text">{selected.status === "suspended" ? "Suspended organizer" : "Rejected application"}</h2>
                <p className="mt-2 text-[12px] leading-relaxed text-muted">
                  {selected.status === "suspended"
                    ? "Their events are hidden and new sales are stopped. You can reinstate them."
                    : "They can apply again after 30 days. You can also reopen the application now."}
                </p>
                <Button className="mt-4 w-full" onClick={() => (selected.status === "suspended" ? change("approved", `${selected.name} is reinstated.`) : change("new", `${selected.name} was reopened.`))}>
                  {selected.status === "suspended" ? "Reinstate organizer" : "Reopen application"}
                </Button>
              </>
            )}
          </Panel>
        </div>
      )}

      <Dialog open={viewing !== null} onClose={() => setViewing(null)} title={viewing ?? "Document"}>
        <p className="text-sm leading-relaxed text-muted">
          Documents open from private storage for staff only. This preview doesn&apos;t include real files, so there is nothing to show yet.
        </p>
        <div className="mt-6 flex justify-end">
          <Button variant="ghost" onClick={() => setViewing(null)}>
            Close
          </Button>
        </div>
      </Dialog>
      <Toast message={toast} />
    </>
  );
}
