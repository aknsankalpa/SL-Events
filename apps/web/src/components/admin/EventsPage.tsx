"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ChevronRight, Eye, EyeOff, Flag, Pencil, Search } from "lucide-react";
import { CategoryIcon, coverGradients, coverIconClass } from "@/components/events/CategoryIcon";
import { Button, LinkButton } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/StatusBadge";
import { eventTabCounts, seedEvents, type AdminEvent, type AdminEventStatus } from "@/lib/admin";
import type { CategoryId } from "@/lib/data";
import { logAudit, updateAdmin } from "@/lib/adminStore";
import { formatKrw } from "@/lib/format";
import { AdminHeader, Dialog, Meter, Panel, Tabs, Toast } from "./ui";
import { useAdminEvents } from "./useAdmin";

type Tab = "all" | AdminEventStatus;
type Action = "unpublish" | "cancel" | "changes" | "edit" | null;

const statusMeta: Record<AdminEventStatus, { label: string; tone: "success" | "warning" | "neutral" | "danger" }> = {
  live: { label: "Live", tone: "success" },
  review: { label: "For review", tone: "warning" },
  draft: { label: "Draft", tone: "neutral" },
  unpublished: { label: "Unpublished", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "danger" },
  ended: { label: "Ended", tone: "neutral" },
};

export function EventsPage() {
  const params = useSearchParams();
  const { events, dismissed } = useAdminEvents();
  const initialTab = params.get("tab");
  const [tab, setTab] = useState<Tab>(["review", "live", "draft", "unpublished", "cancelled", "ended"].includes(initialTab ?? "") ? (initialTab as Tab) : "all");
  const [organizer, setOrganizer] = useState("");
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [selectedId, setSelectedId] = useState(params.get("event") ?? "baila-night");
  const [action, setAction] = useState<Action>(null);
  const [reason, setReason] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string>();
  const [toast, setToast] = useState<string>();

  const organizers = [...new Set(seedEvents.map((e) => e.organizer))];
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((e) => (tab === "all" || e.status === tab) && (!organizer || e.organizer === organizer) && (!q || `${e.title} ${e.organizer}`.toLowerCase().includes(q)));
  }, [events, tab, organizer, query]);
  const selected = events.find((e) => e.id === selectedId) ?? list[0];

  const count = (t: Tab) => (t === "all" ? eventTabCounts.all : eventTabCounts[t] - seedEvents.filter((e) => e.status === t).length + events.filter((e) => e.status === t).length);
  const say = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(undefined), 3200);
  };

  function setStatus(e: AdminEvent, status: AdminEventStatus, verb: string, why?: string) {
    // TODO: the API changes the event, tells the organizer, and for a cancellation tells every buyer.
    updateAdmin((s) => ({ ...s, eventStatus: { ...s.eventStatus, [e.id]: status } }));
    logAudit({
      type: "decision",
      action: `${verb} ${e.title}`,
      item: `event: ${e.id}`,
      detail: { changes: [{ label: "Status", from: statusMeta[e.status].label, to: statusMeta[status].label }, ...(why ? [{ label: "Reason", from: "—", to: why }] : [])] },
    });
    say(`${verb} ${e.title}.`);
  }

  function confirm() {
    if (!selected || !action) return;
    if (action === "edit") {
      if (!title.trim()) return setError("The title can't be empty.");
      updateAdmin((s) => ({ ...s, eventTitles: { ...s.eventTitles, [selected.id]: title.trim() } }));
      logAudit({ type: "content", action: `Edited the title of ${selected.title}`, item: `event: ${selected.id}`, detail: { changes: [{ label: "Title", from: selected.title, to: title.trim() }] } });
      say("Saved.");
    } else {
      if (!reason.trim()) return setError("Give a reason first. The organizer sees it.");
      if (action === "unpublish") setStatus(selected, "unpublished", "Unpublished", reason.trim());
      if (action === "cancel") setStatus(selected, "cancelled", "Cancelled", reason.trim());
      if (action === "changes") {
        logAudit({ type: "decision", action: `Asked for changes to ${selected.title}`, item: `event: ${selected.id}`, detail: { changes: [{ label: "Note to organizer", from: "—", to: reason.trim() }] } });
        say("Sent to the organizer.");
      }
    }
    close();
  }

  const close = () => {
    setAction(null);
    setReason("");
    setError(undefined);
  };
  const open = (a: Action) => {
    setTitle(selected?.title ?? "");
    setAction(a);
  };

  const dialogTitle = { unpublish: "Unpublish this event?", cancel: "Cancel this event?", changes: "Ask for changes", edit: "Edit content" }[action ?? "edit"];

  return (
    <>
      <AdminHeader
        section="Events"
        title="All events"
        actions={
          <label className="flex h-11 w-full items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 focus-within:border-gold sm:w-72">
            <Search size={14} aria-hidden className="text-muted" />
            <span className="sr-only">Search events</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search events or organizers" className="h-full w-full bg-transparent text-[13px] text-text placeholder:text-dim focus:outline-none" />
          </label>
        }
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Tabs
            label="Event status"
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "all", label: "All", count: count("all") },
              { id: "review", label: "Waiting for review", count: count("review") },
              { id: "live", label: "Live", count: count("live") },
              { id: "draft", label: "Draft", count: count("draft") },
              { id: "unpublished", label: "Unpublished", count: count("unpublished") },
              { id: "cancelled", label: "Cancelled", count: count("cancelled") },
              { id: "ended", label: "Ended", count: count("ended") },
            ]}
          />
        </div>
        <Select
          aria-label="Organizer"
          value={organizer}
          onChange={(e) => setOrganizer(e.target.value)}
          className="h-10 w-full rounded-xl border border-line bg-surface-2 px-3 text-[13px] text-text focus:border-gold focus:outline-none sm:w-52"
        >
          <option value="">All organizers</option>
          {organizers.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      </div>

      <div className="mt-6 grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Panel className="overflow-hidden" aria-label="Events">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-[13px]">
              <thead className="border-b border-line text-[10px] uppercase tracking-wider text-dim">
                <tr>
                  {["Event", "Organizer", "Date", "Status", "Tickets sold"].map((h) => (
                    <th key={h} scope="col" className="px-4 py-3.5 font-bold first:pl-5">
                      {h}
                    </th>
                  ))}
                  <th scope="col" className="w-8">
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((e) => {
                  const active = selected?.id === e.id;
                  const flagged = e.reports && !dismissed[e.id];
                  return (
                    <tr
                      key={e.id}
                      onClick={() => setSelectedId(e.id)}
                      className={`cursor-pointer border-b border-line last:border-b-0 ${active ? "bg-gold/10" : "hover:bg-surface-2/50"}`}
                    >
                      <td className="py-3.5 pl-5 pr-4">
                        <button type="button" onClick={() => setSelectedId(e.id)} aria-current={active ? "true" : undefined} className="text-left font-bold text-text focus-visible:focus-ring">
                          {e.title}
                        </button>
                        {flagged && (
                          <span className="mt-1 flex items-center gap-1.5 text-[11px] text-danger">
                            <Flag size={11} aria-hidden /> {e.reports!.count} buyer reports
                          </span>
                        )}
                      </td>
                      <td className="px-4 text-muted">{e.organizer}</td>
                      <td className="whitespace-nowrap px-4 text-muted">{e.date}</td>
                      <td className="px-4">
                        <Badge tone={statusMeta[e.status].tone}>{statusMeta[e.status].label}</Badge>
                      </td>
                      <td className="px-4">
                        <p className="mb-1.5 text-[11px] text-muted">
                          {e.sold} / {e.capacity}
                        </p>
                        <Meter value={e.sold} max={e.capacity} className="w-24" />
                      </td>
                      <td className="pr-4 text-dim">
                        <ChevronRight size={14} aria-hidden />
                      </td>
                    </tr>
                  );
                })}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted">
                      No events match.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        {selected && (
          <Panel className="overflow-hidden" aria-label={`Details for ${selected.title}`}>
            <div className={`relative flex h-32 items-center justify-center bg-gradient-to-br ${coverGradients[selected.category as CategoryId]}`}>
              <span className="absolute left-3 top-3 rounded-full border border-gold/40 bg-black/60 px-2.5 py-1 text-[10px] font-bold uppercase text-gold">{selected.category}</span>
              {selected.tag && <span className="absolute right-3 top-3 rounded-full bg-danger px-2.5 py-1 text-[10px] font-bold text-white">{selected.tag}</span>}
              <CategoryIcon id={selected.category as CategoryId} size={44} strokeWidth={1.5} className={coverIconClass(selected.category as CategoryId)} />
            </div>
            <div className="p-5">
              <h2 className="font-display text-[22px] font-bold leading-tight text-text">{selected.title}</h2>
              <p className="mt-1.5 text-xs text-dim">
                {selected.organizer} · {selected.when} · {selected.venue}
              </p>

              <h3 className="mb-3 mt-5 text-[10px] font-bold uppercase tracking-widest text-dim">Ticket inventory</h3>
              <ul className="space-y-3">
                {selected.inventory.map((t) => (
                  <li key={t.name}>
                    <div className="mb-1.5 flex items-center justify-between text-[11px]">
                      <span className="font-bold text-text">
                        {t.name} · {formatKrw(t.price)}
                      </span>
                      <span className="text-dim">
                        {t.sold} / {t.capacity}
                      </span>
                    </div>
                    <Meter value={t.sold} max={t.capacity} />
                  </li>
                ))}
              </ul>
              <p className="mt-3 flex justify-between text-[11px] text-dim">
                <span>Held for payment</span>
                <span className="font-bold text-text">{selected.held}</span>
              </p>

              {selected.reports && !dismissed[selected.id] && (
                <div className="mt-5 rounded-xl border border-danger/40 bg-danger/10 p-4">
                  <p className="flex items-center gap-2 text-[13px] font-bold text-danger">
                    <Flag size={13} aria-hidden /> {selected.reports.text}
                  </p>
                  <p className="mt-2 text-[11px] leading-relaxed text-muted">{selected.reports.detail}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-line text-text hover:bg-surface-2"
                      onClick={() => {
                        logAudit({ type: "decision", action: `Messaged the organizer about reports on ${selected.title}`, item: `event: ${selected.id}` });
                        say(`Message sent to ${selected.organizer}.`);
                      }}
                    >
                      Message organizer
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-line text-text hover:bg-surface-2"
                      onClick={() => {
                        updateAdmin((s) => ({ ...s, reportsDismissed: { ...s.reportsDismissed, [selected.id]: true } }));
                        logAudit({ type: "decision", action: `Dismissed buyer reports on ${selected.title}`, item: `event: ${selected.id}` });
                      }}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              )}

              <h3 className="mb-3 mt-5 text-[10px] font-bold uppercase tracking-widest text-dim">Actions</h3>
              {selected.status === "review" && (
                <div className="mb-2 grid grid-cols-2 gap-2">
                  <Button size="sm" onClick={() => setStatus(selected, "live", "Approved and published")}>
                    Approve and publish
                  </Button>
                  <Button size="sm" variant="outline" className="border-line text-text hover:bg-surface-2" onClick={() => open("changes")}>
                    Ask for changes
                  </Button>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                {selected.slug ? (
                  <LinkButton href={`/events/${selected.slug}`} size="sm" variant="outline" className="border-line text-text hover:bg-surface-2">
                    <Eye size={14} aria-hidden /> View page
                  </LinkButton>
                ) : (
                  <Button size="sm" variant="outline" disabled className="border-line">
                    <Eye size={14} aria-hidden /> View page
                  </Button>
                )}
                <Button size="sm" variant="outline" className="border-line text-text hover:bg-surface-2" onClick={() => open("edit")}>
                  <Pencil size={14} aria-hidden /> Edit content
                </Button>
              </div>
              {selected.status === "unpublished" ? (
                <Button size="sm" variant="outline" className="mt-2 w-full border-line text-text hover:bg-surface-2" onClick={() => setStatus(selected, "live", "Republished")}>
                  <Eye size={14} aria-hidden /> Publish again
                </Button>
              ) : (
                selected.status === "live" && (
                  <Button size="sm" variant="outline" className="mt-2 w-full border-line text-text hover:bg-surface-2" onClick={() => open("unpublish")}>
                    <EyeOff size={14} aria-hidden /> Unpublish (hide and stop sales)
                  </Button>
                )
              )}
              {["live", "review", "unpublished"].includes(selected.status) && (
                <Button size="sm" variant="outline" className="mt-2 w-full border-danger/60 text-danger hover:bg-danger/10" onClick={() => open("cancel")}>
                  Cancel event{selected.sold > 0 ? ` and tell ${selected.sold} buyers` : ""}
                </Button>
              )}
              <p className="mt-3 text-[11px] leading-relaxed text-dim">Unpublish and cancel ask for a reason first.</p>
              <Link href={`/admin/audit?q=${encodeURIComponent(selected.id)}`} className="mt-3 inline-block text-[11px] font-bold text-amber hover:text-gold">
                See this event in the audit log
              </Link>
            </div>
          </Panel>
        )}
      </div>

      <Dialog open={action !== null} onClose={close} title={dialogTitle}>
        {action === "edit" ? (
          <div>
            <label htmlFor="edit-title" className="mb-2 block text-xs font-bold text-muted">
              Event title
            </label>
            <input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} className="h-11 w-full rounded-lg border border-line bg-surface-2 px-3 text-sm text-text focus:border-gold focus:outline-none" />
            <p className="mt-2 text-[11px] text-dim">The organizer is told when an admin changes their event.</p>
          </div>
        ) : (
          <div>
            <p className="text-sm leading-relaxed text-muted">
              {action === "cancel"
                ? "The event stops selling and every buyer is told by email. This can't be undone."
                : action === "unpublish"
                  ? "The event is hidden from the website and sales stop. Existing tickets keep working."
                  : "Tell the organizer what to fix before this event can go live."}
            </p>
            <label htmlFor="action-reason" className="mb-2 mt-4 block text-xs font-bold text-muted">
              Reason (the organizer sees this)
            </label>
            <textarea id="action-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className="w-full resize-none rounded-lg border border-line bg-surface-2 p-3 text-sm text-text focus:border-gold focus:outline-none" />
          </div>
        )}
        {error && <p className="mt-2 text-xs text-danger">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={close}>
            Back
          </Button>
          <Button variant={action === "cancel" ? "danger" : "primary"} onClick={confirm}>
            {action === "edit" ? "Save" : action === "cancel" ? "Cancel event" : action === "unpublish" ? "Unpublish" : "Send"}
          </Button>
        </div>
      </Dialog>
      <Toast message={toast} />
    </>
  );
}
