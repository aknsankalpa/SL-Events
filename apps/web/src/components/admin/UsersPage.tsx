"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Info, Lock, Search, ShieldCheck, ShieldOff, UserPlus, X } from "lucide-react";
import { useSession } from "@/components/auth/useSession";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Badge } from "@/components/ui/StatusBadge";
import type { Person } from "@/server/users";
import { AdminHeader, Avatar, Dialog, Panel, Tabs, Toast } from "./ui";

type Tab = "all" | "customers" | "organizers" | "staff" | "admins";
type Counts = Record<Tab, number>;

const tabMain: Record<Tab, Person["main"] | null> = { all: null, customers: "Customer", organizers: "Organizer", staff: "Door staff", admins: "Admin" };
const roleTone = (r: Person["main"]): "danger" | "warning" | "neutral" => (r === "Admin" ? "danger" : r === "Door staff" ? "warning" : "neutral");

const roleText: Record<Person["main"], string> = {
  Admin: "Admins have full access to the admin portal: payments, events, organizers, users, content and settings.",
  Organizer: "Organizers manage their own events in the organizer area. Organizer access comes from an approved application.",
  "Door staff": "Door staff check tickets in at the events they are assigned to. Organizers assign them per event.",
  Customer: "Customers use the public website and their own account.",
};

/** People and their access. Every change is made on the server and recorded in the audit log. */
export function UsersPage() {
  const params = useSearchParams();
  const { user: me } = useSession();
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [people, setPeople] = useState<Person[] | null>(null);
  const [counts, setCounts] = useState<Counts>({ all: 0, customers: 0, organizers: 0, staff: 0, admins: 0 });
  const [loadError, setLoadError] = useState<string>();
  const [selectedId, setSelectedId] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ name: "", email: "" });
  const [inviteError, setInviteError] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<"deactivate" | "remove-admin" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [toast, setToast] = useState<string>();

  const load = useCallback(async (q: string) => {
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`, { credentials: "same-origin", cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as { people?: Person[]; counts?: Counts; error?: string };
      if (!res.ok) return setLoadError(data.error ?? "Couldn't load people.");
      setPeople(data.people ?? []);
      if (data.counts) setCounts(data.counts);
      setLoadError(undefined);
    } catch {
      setLoadError("We couldn't reach SL Events.");
    }
  }, []);

  // Searching asks the server (there may be thousands of people); typing waits a moment before it asks.
  useEffect(() => {
    const id = setTimeout(() => void load(query), query ? 300 : 0);
    return () => clearTimeout(id);
  }, [query, load]);

  const list = useMemo(() => (people ?? []).filter((u) => !tabMain[tab] || u.main === tabMain[tab]), [people, tab]);
  const selected = selectedId === "none" ? undefined : ((people ?? []).find((u) => u.id === selectedId) ?? list[0]);
  const isMe = !!selected && selected.email === me?.email;

  const say = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(undefined), 3200);
  };

  async function change(body: { admin?: boolean; active?: boolean }, done: string) {
    if (!selected) return;
    setBusy(true);
    setError(undefined);
    try {
      const res = await fetch(`/api/admin/users/${selected.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) setError(data.error ?? "That didn't work. Try again.");
      else say(done);
    } catch {
      setError("We couldn't reach SL Events.");
    }
    setBusy(false);
    setConfirm(null);
    await load(query);
  }

  async function sendInvite() {
    const found: Record<string, string> = {};
    if (!invite.name.trim()) found.name = "Enter their name.";
    if (!/^\S+@\S+\.\S+$/.test(invite.email)) found.email = "Enter a valid email address.";
    setInviteError(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(invite),
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as { id?: string; created?: boolean; error?: string; errors?: Record<string, string> };
      if (!res.ok) {
        setInviteError(data.errors ?? { email: data.error ?? "Couldn't add them." });
        setBusy(false);
        return;
      }
      setInviteOpen(false);
      setInvite({ name: "", email: "" });
      setSelectedId(data.id ?? "");
      say(
        data.created
          ? `${invite.name.trim()} is an admin. They set a password with "Forgot password" on the log-in page.`
          : `${invite.name.trim()} now has admin access.`,
      );
      await load(query);
    } catch {
      setInviteError({ email: "We couldn't reach SL Events." });
    }
    setBusy(false);
  }

  return (
    <>
      <AdminHeader
        section="Users & roles"
        title="Users and roles"
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus size={16} aria-hidden /> Add an admin
          </Button>
        }
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Tabs
            label="People"
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "all", label: "All", count: counts.all },
              { id: "customers", label: "Customers", count: counts.customers },
              { id: "organizers", label: "Organizers", count: counts.organizers },
              { id: "staff", label: "Door staff", count: counts.staff },
              { id: "admins", label: "Admins", count: counts.admins },
            ]}
          />
        </div>
        <label className="flex h-10 w-full items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 focus-within:border-gold sm:w-72">
          <Search size={14} aria-hidden className="text-muted" />
          <span className="sr-only">Search people</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name or email" className="h-full w-full bg-transparent text-[13px] text-text placeholder:text-dim focus:outline-none" />
        </label>
      </div>

      <div className="mt-6 grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <Panel className="overflow-hidden" aria-label="People">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[38rem] text-left text-[13px]">
              <thead className="border-b border-line text-[10px] uppercase tracking-wider text-dim">
                <tr>
                  {["Person", "Role", "Status", "Last signed in", "Bookings"].map((h) => (
                    <th key={h} scope="col" className="px-4 py-3.5 font-bold first:pl-5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((u) => {
                  const active = selected?.id === u.id;
                  return (
                    <tr key={u.id} onClick={() => setSelectedId(u.id)} className={`cursor-pointer border-b border-line last:border-b-0 ${active ? "bg-gold/10" : "hover:bg-surface-2/50"}`}>
                      <td className="py-3 pl-5 pr-4">
                        <button type="button" onClick={() => setSelectedId(u.id)} aria-current={active ? "true" : undefined} className="flex items-center gap-3 text-left focus-visible:focus-ring">
                          <Avatar initials={u.initials} />
                          <span className="min-w-0 leading-tight">
                            <span className="block font-bold text-text">{u.name}</span>
                            <span className="mt-1 block truncate text-[11px] text-dim">{u.email}</span>
                          </span>
                        </button>
                      </td>
                      <td className="px-4">
                        <Badge tone={roleTone(u.main)}>{u.main}</Badge>
                      </td>
                      <td className="px-4">
                        <Badge tone={u.active ? "success" : "danger"}>{u.active ? "Active" : "Deactivated"}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 text-muted">{u.last}</td>
                      <td className="px-4 text-muted">{u.bookings || "—"}</td>
                    </tr>
                  );
                })}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted">
                      {people === null ? (loadError ?? "Loading people…") : "Nobody matches."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        {selected && (
          <Panel className="p-5" aria-label={`Details for ${selected.name}`}>
            <div className="flex items-start gap-3 border-b border-line pb-4">
              <Avatar initials={selected.initials} size={44} />
              <div className="min-w-0 flex-1 leading-tight">
                <h2 className="truncate text-base font-bold text-text">
                  {selected.name}
                  {isMe ? " (you)" : ""}
                </h2>
                <p className="mt-1 truncate text-[11px] text-dim">
                  {selected.email}
                  {selected.verified ? " · email confirmed" : " · email not confirmed"}
                </p>
                <p className="mt-1 text-[11px] text-dim">Joined {selected.joined}</p>
              </div>
              <button type="button" aria-label="Close details" onClick={() => setSelectedId("none")} className="rounded p-1 text-muted hover:text-text xl:hidden">
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {selected.roles.map((r) => (
                <Badge key={r} tone={r === "admin" ? "danger" : "neutral"}>
                  {r === "staff" ? "Door staff" : r[0]!.toUpperCase() + r.slice(1)}
                </Badge>
              ))}
            </div>
            <p className="mt-3 rounded-lg border border-line bg-surface-2 p-3 text-xs leading-relaxed text-muted">
              {roleText[selected.main]}
              {selected.organizer ? ` Organizer: ${selected.organizer}.` : ""}
              {!selected.hasPassword ? " They haven't set a password yet; they do that with \"Forgot password\"." : ""}
            </p>

            <h3 className="mb-3 mt-5 text-[10px] font-bold uppercase tracking-widest text-dim">Recent activity</h3>
            {selected.recent.length ? (
              <ul className="space-y-2">
                {selected.recent.map((r, i) => (
                  <li key={`${r.text}-${i}`} className="flex items-start justify-between gap-3 text-[11px]">
                    <span className="text-muted">{r.text}</span>
                    <span className="shrink-0 text-dim">{r.time}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-dim">Nothing yet.</p>
            )}

            <div className="mt-5 grid grid-cols-2 gap-2">
              {selected.roles.includes("admin") ? (
                <Button size="md" variant="outline" className="border-line text-text hover:bg-surface-2" disabled={busy || isMe} onClick={() => setConfirm("remove-admin")}>
                  <ShieldOff size={14} aria-hidden /> Remove admin
                </Button>
              ) : (
                <Button size="md" variant="outline" className="border-line text-text hover:bg-surface-2" disabled={busy || !selected.active} onClick={() => void change({ admin: true }, `${selected.name} now has admin access.`)}>
                  <ShieldCheck size={14} aria-hidden /> Make admin
                </Button>
              )}
              <Button
                size="md"
                variant="outline"
                className="border-danger/60 text-danger hover:bg-danger/10"
                disabled={busy || isMe}
                onClick={() => (selected.active ? setConfirm("deactivate") : void change({ active: true }, `${selected.name} is active again.`))}
              >
                {selected.active ? "Deactivate" : "Reactivate"}
              </Button>
            </div>
            {confirm && (
              <div role="alert" className="mt-3 rounded-lg border border-amber/40 bg-amber/10 p-3 text-[11px] text-text">
                {confirm === "deactivate"
                  ? `${selected.name.split(" ")[0]} will be signed out everywhere and can't log in until you reactivate them.`
                  : `${selected.name.split(" ")[0]} loses admin access and is signed out.`}
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={busy}
                    onClick={() =>
                      void (confirm === "deactivate"
                        ? change({ active: false }, `${selected.name} is deactivated.`)
                        : change({ admin: false }, `${selected.name} no longer has admin access.`))
                    }
                  >
                    {confirm === "deactivate" ? "Yes, deactivate" : "Yes, remove admin"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>
                    Keep as is
                  </Button>
                </div>
              </div>
            )}
            {error && (
              <p role="alert" className="mt-3 text-xs font-bold text-danger">
                {error}
              </p>
            )}
            <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-dim">
              <Info size={12} aria-hidden className="mt-0.5 shrink-0" /> Every admin has full access for now. Separate permissions (for example, payments only) will come later.
            </p>
            <p className="mt-2 flex items-start gap-2 text-[11px] leading-relaxed text-dim">
              <Lock size={12} aria-hidden className="mt-0.5 shrink-0" /> Every change here is saved in the audit log with your name and the time.
            </p>
          </Panel>
        )}
      </div>

      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} title="Add an admin">
        <div className="space-y-4">
          <Field label="Name" value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} error={inviteError.name} autoComplete="off" />
          <Field label="Email" type="email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} error={inviteError.email} autoComplete="off" />
          <p className="text-[11px] leading-relaxed text-dim">
            They get full admin access. If the email has no SL Events account yet, one is made: they set their password with &quot;Forgot password&quot; on the log-in page. Emails aren&apos;t sent yet, so let them know yourself.
          </p>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setInviteOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => void sendInvite()} disabled={busy}>
            Add admin
          </Button>
        </div>
      </Dialog>
      <Toast message={toast} />
    </>
  );
}
