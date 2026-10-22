"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Lock, Search, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/StatusBadge";
import { actions, modules, rolePermissions, userTabCounts, type AdminUser, type Action, type Module, type Permissions, type Role } from "@/lib/admin";
import { logAudit, updateAdmin } from "@/lib/adminStore";
import { AdminHeader, Avatar, Dialog, Panel, Tabs, Toast } from "./ui";
import { useAdminState, useAdminUsers } from "./useAdmin";

type Tab = "all" | "customers" | "organizers" | "staff" | "admins";

const staffRoles: Role[] = ["Owner", "Payments staff", "Content editor"];
const allRoles: Role[] = ["Owner", "Payments staff", "Content editor", "Organizer", "Customer"];
const tabRoles: Record<Tab, Role[] | null> = { all: null, customers: ["Customer"], organizers: ["Organizer"], staff: ["Payments staff", "Content editor"], admins: ["Owner"] };

const roleTone = (r: Role): "danger" | "warning" | "neutral" => (r === "Owner" ? "danger" : r === "Customer" || r === "Organizer" ? "neutral" : "warning");

export function UsersPage() {
  const params = useSearchParams();
  const { users } = useAdminUsers();
  const state = useAdminState();
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [selectedId, setSelectedId] = useState("ishara");
  const [draft, setDraft] = useState<Record<string, { role: Role; permissions: Permissions } | undefined>>({});
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ name: "", email: "", role: "Payments staff" as Role });
  const [inviteError, setInviteError] = useState<Record<string, string>>({});
  const [deactivating, setDeactivating] = useState(false);
  const [toast, setToast] = useState<string>();

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => (!tabRoles[tab] || tabRoles[tab]!.includes(u.role)) && (!q || `${u.name} ${u.email}`.toLowerCase().includes(q)));
  }, [users, tab, query]);
  const selected = selectedId === "none" ? undefined : (users.find((u) => u.id === selectedId) ?? list[0]);

  const saved = selected ? (state.users[selected.id]?.permissions ?? rolePermissions[selected.role]) : undefined;
  const current = selected ? (draft[selected.id] ?? { role: selected.role, permissions: saved! }) : undefined;
  const staff = selected ? staffRoles.includes(selected.role) : false;
  const dirty = !!selected && !!draft[selected.id];

  const say = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(undefined), 3200);
  };

  function setRole(role: Role) {
    if (!selected) return;
    setDraft((d) => ({ ...d, [selected.id]: { role, permissions: rolePermissions[role] } }));
  }

  function toggle(m: Module, a: Action) {
    if (!selected || !current) return;
    const permissions = { ...current.permissions, [m]: { ...current.permissions[m], [a]: !current.permissions[m][a] } };
    setDraft((d) => ({ ...d, [selected.id]: { role: current.role, permissions } }));
  }

  function save() {
    if (!selected || !current) return;
    // TODO: the API checks that only an owner can change permissions, and records who did.
    updateAdmin((s) => ({ ...s, users: { ...s.users, [selected.id]: { ...s.users[selected.id], role: current.role, permissions: current.permissions } } }));
    const changes = [
      ...(current.role !== selected.role ? [{ label: "Role", from: selected.role, to: current.role }] : []),
      ...modules.flatMap((m) =>
        actions.filter((a) => current.permissions[m][a] !== saved![m][a]).map((a) => ({ label: `${m} · ${a}`, from: saved![m][a] ? "On" : "Off", to: current.permissions[m][a] ? "On" : "Off" })),
      ),
    ];
    logAudit({ type: "permission", action: `Changed ${selected.name.split(" ")[0]}'s permissions`, item: `user: ${selected.id}`, detail: { changes } });
    setDraft((d) => ({ ...d, [selected.id]: undefined }));
    say("Permissions saved.");
  }

  function toggleActive() {
    if (!selected) return;
    const next = !selected.active;
    updateAdmin((s) => ({ ...s, users: { ...s.users, [selected.id]: { ...s.users[selected.id], active: next } } }));
    logAudit({ type: "account", action: `${next ? "Reactivated" : "Deactivated"} ${selected.name}`, item: `user: ${selected.id}`, detail: { changes: [{ label: "Account", from: next ? "Deactivated" : "Active", to: next ? "Active" : "Deactivated" }] } });
    setDeactivating(false);
    say(next ? `${selected.name} is active again.` : `${selected.name} is deactivated.`);
  }

  function sendInvite() {
    const found: Record<string, string> = {};
    if (!invite.name.trim()) found.name = "Enter their name.";
    if (!/^\S+@\S+\.\S+$/.test(invite.email)) found.email = "Enter a valid email address.";
    setInviteError(found);
    if (Object.keys(found).length) return;
    const id = `invited-${Date.now().toString(36)}`;
    const person: AdminUser = {
      id,
      name: invite.name.trim(),
      initials: invite.name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]!.toUpperCase()).join(""),
      email: invite.email.trim().toLowerCase(),
      role: invite.role,
      active: true,
      last: "Invited",
      bookings: null,
      recent: [{ text: "Invited by " + "Sanduni Perera", time: "Just now" }],
    };
    // TODO: the API emails an invite link that expires; here the person simply appears in the list.
    updateAdmin((s) => ({ ...s, invited: [person, ...s.invited] }));
    logAudit({ type: "permission", action: `Invited ${person.name} as ${person.role}`, item: `user: ${person.id}` });
    setInviteOpen(false);
    setInvite({ name: "", email: "", role: "Payments staff" });
    setSelectedId(id);
    say(`Invite sent to ${person.email}.`);
  }

  return (
    <>
      <AdminHeader
        section="Users & roles"
        title="Users and roles"
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus size={16} aria-hidden /> Invite staff member
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
              { id: "all", label: "All", count: userTabCounts.all },
              { id: "customers", label: "Customers", count: userTabCounts.customers },
              { id: "organizers", label: "Organizers", count: userTabCounts.organizers },
              { id: "staff", label: "Staff", count: userTabCounts.staff },
              { id: "admins", label: "Admins", count: userTabCounts.admins },
            ]}
          />
        </div>
        <label className="flex h-10 w-full items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 focus-within:border-gold sm:w-72">
          <Search size={14} aria-hidden className="text-muted" />
          <span className="sr-only">Search people</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, email or phone" className="h-full w-full bg-transparent text-[13px] text-text placeholder:text-dim focus:outline-none" />
        </label>
      </div>

      <div className="mt-6 grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <Panel className="overflow-hidden" aria-label="People">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[38rem] text-left text-[13px]">
              <thead className="border-b border-line text-[10px] uppercase tracking-wider text-dim">
                <tr>
                  {["Person", "Role", "Status", "Last active", "Bookings"].map((h) => (
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
                        <Badge tone={roleTone(u.role)}>{u.role}</Badge>
                      </td>
                      <td className="px-4">
                        <Badge tone={u.active ? "success" : "danger"}>{u.active ? "Active" : "Deactivated"}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 text-muted">{u.last}</td>
                      <td className="px-4 text-muted">{u.bookings ?? "—"}</td>
                    </tr>
                  );
                })}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted">
                      Nobody matches.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        {selected && current && saved && (
          <Panel className="p-5" aria-label={`Details for ${selected.name}`}>
            <div className="flex items-start gap-3 border-b border-line pb-4">
              <Avatar initials={selected.initials} size={44} />
              <div className="min-w-0 flex-1 leading-tight">
                <h2 className="truncate text-base font-bold text-text">{selected.name}</h2>
                <p className="mt-1 truncate text-[11px] text-dim">
                  {selected.email}
                  {selected.twoStep ? " · 2-step login on" : ""}
                </p>
              </div>
              <button type="button" aria-label="Close details" onClick={() => setSelectedId("none")} className="rounded p-1 text-muted hover:text-text xl:hidden">
                <X size={16} />
              </button>
            </div>

            <label htmlFor="user-role" className="mb-2 mt-4 block text-[11px] font-bold text-muted">
              Role
            </label>
            <Select
              id="user-role"
              value={current.role}
              onChange={(e) => setRole(e.target.value as Role)}
              disabled={!staff && selected.role !== "Owner"}
              className="h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-sm text-text focus:border-gold focus:outline-none"
            >
              {(staff ? staffRoles : allRoles).map((r) => (
                <option key={r}>{r}</option>
              ))}
            </Select>

            {staff ? (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[19rem] text-[12px]">
                  <thead className="text-[10px] uppercase tracking-wider text-dim">
                    <tr>
                      <th scope="col" className="pb-2 text-left font-bold">
                        Permission
                      </th>
                      {actions.map((a) => (
                        <th key={a} scope="col" className="pb-2 text-center font-bold">
                          {a}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {modules.map((m) => (
                      <tr key={m} className="border-t border-line">
                        <th scope="row" className="py-2 text-left font-normal text-text">
                          {m}
                        </th>
                        {actions.map((a) => (
                          <td key={a} className="py-2 text-center">
                            <input
                              type="checkbox"
                              aria-label={`${m} ${a}`}
                              checked={current.permissions[m][a]}
                              disabled={selected.role === "Owner" && selected.id === "sanduni"}
                              onChange={() => toggle(m, a)}
                              className="checkbox-box size-[18px] cursor-pointer appearance-none rounded border border-line bg-surface-2 checked:border-amber checked:bg-amber focus-visible:focus-ring disabled:cursor-not-allowed disabled:opacity-60"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-5 rounded-lg border border-line bg-surface-2 p-3 text-xs leading-relaxed text-muted">
                {selected.role === "Customer" ? "Customers can only use the public website and their own account." : "Organizers manage their own events from the organizer area."} They have no admin permissions.
              </p>
            )}

            <h3 className="mb-3 mt-5 text-[10px] font-bold uppercase tracking-widest text-dim">Recent activity</h3>
            <ul className="space-y-2">
              {selected.recent.map((r) => (
                <li key={r.text} className="flex items-start justify-between gap-3 text-[11px]">
                  <span className="text-muted">{r.text}</span>
                  <span className="shrink-0 text-dim">{r.time}</span>
                </li>
              ))}
            </ul>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button size="md" onClick={save} disabled={!dirty}>
                Save permissions
              </Button>
              {deactivating ? (
                <Button size="md" variant="danger" onClick={toggleActive}>
                  {selected.active ? "Yes, deactivate" : "Yes, reactivate"}
                </Button>
              ) : (
                <Button size="md" variant="outline" className="border-danger/60 text-danger hover:bg-danger/10" onClick={() => (selected.active ? setDeactivating(true) : toggleActive())}>
                  {selected.active ? "Deactivate" : "Reactivate"}
                </Button>
              )}
            </div>
            {deactivating && (
              <p role="alert" className="mt-2 text-[11px] text-amber">
                {selected.name.split(" ")[0]} will be signed out and can&apos;t log in until you reactivate them.{" "}
                <button type="button" onClick={() => setDeactivating(false)} className="font-bold underline">
                  Keep active
                </button>
              </p>
            )}
            <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-dim">
              <Lock size={12} aria-hidden className="mt-0.5 shrink-0" /> Every decision here is saved in the audit log with your name and the time.
            </p>
          </Panel>
        )}
      </div>

      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite a staff member">
        <div className="space-y-4">
          <Field label="Name" value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} error={inviteError.name} autoComplete="off" />
          <Field label="Email" type="email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} error={inviteError.email} autoComplete="off" />
          <div>
            <label htmlFor="invite-role" className="mb-2 block text-xs font-bold text-muted">
              Role
            </label>
            <Select id="invite-role" value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value as Role })} className="h-12 w-full rounded-lg border border-line bg-surface px-3 text-sm text-text focus:border-gold focus:outline-none">
              {staffRoles.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </Select>
            <p className="mt-1.5 text-[11px] text-dim">You can fine-tune their permissions after they accept.</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setInviteOpen(false)}>
            Cancel
          </Button>
          <Button onClick={sendInvite}>Send invite</Button>
        </div>
      </Dialog>
      <Toast message={toast} />
    </>
  );
}
