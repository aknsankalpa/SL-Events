"use client";

import { useState } from "react";
import { Ban, Check, Mail, Minus, Pencil, Plus, ShieldCheck, Trash2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Badge } from "@/components/ui/StatusBadge";
import {
  formatClock,
  GATES,
  permissionLabels,
  roleMeta,
  staffInitials,
  type StaffMember,
  type StaffRole,
  type StaffStatus,
} from "@/lib/operations";
import { newId } from "@/lib/organizer";
import { Dialog, Panel } from "../ui";
import { Select } from "@/components/ui/Select";

type Props = {
  staff: StaffMember[];
  onAdd: (s: StaffMember) => void;
  onUpdate: (s: StaffMember) => void;
  onRemove: (s: StaffMember) => void;
  bare?: boolean;
};

const statusTone: Record<StaffStatus, "success" | "warning" | "danger"> = {
  active: "success",
  invited: "warning",
  suspended: "danger",
};
const statusLabel: Record<StaffStatus, string> = { active: "Active", invited: "Invite sent", suspended: "Suspended" };

const looksLikeContact = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || /^\+?[\d\s-]{8,15}$/.test(v);

export function StaffPanel({ staff, onAdd, onUpdate, onRemove, bare }: Props) {
  const [editing, setEditing] = useState<StaffMember | "new" | null>(null);
  const [removing, setRemoving] = useState<StaffMember | null>(null);

  const active = staff.filter((s) => s.status === "active").length;

  return (
    <Panel bare={bare} className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-text">Event staff</h2>
          <p className="mt-1 text-[11px] text-dim">
            {staff.length === 0
              ? "No one is assigned yet"
              : `${active} active of ${staff.length} · only listed people can scan or check guests in`}
          </p>
        </div>
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus size={14} aria-hidden /> Add staff
        </Button>
      </div>

      {staff.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-line p-8 text-center">
          <ShieldCheck size={24} aria-hidden className="mx-auto text-dim" />
          <p className="mt-3 text-sm font-bold text-text">Assign your door team</p>
          <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-muted">
            Invite people by email or phone, choose their role and door. Their access ends automatically after the event.
          </p>
        </div>
      ) : (
        <ul className="mt-5 divide-y divide-line rounded-xl border border-line">
          {staff.map((s) => (
            <li key={s.id} className="p-4">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="flex size-10 shrink-0 items-center justify-center rounded-full border border-gold/50 bg-surface-2 text-[12px] font-bold text-gold"
                >
                  {staffInitials(s.name)}
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-[13px] font-bold text-text">{s.name}</p>
                  <p className="mt-1 truncate text-[11px] text-dim">{s.contact}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Edit ${s.name}`}
                    onClick={() => setEditing(s)}
                    className="flex size-9 items-center justify-center rounded-lg border border-line text-muted hover:border-gold/50 hover:text-gold focus-visible:focus-ring"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${s.name}`}
                    onClick={() => setRemoving(s)}
                    className="flex size-9 items-center justify-center rounded-lg border border-line text-muted hover:border-danger/60 hover:text-danger focus-visible:focus-ring"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 pl-[52px]">
                <Badge tone="neutral" className="normal-case">
                  {roleMeta[s.role].label}
                </Badge>
                <span className="text-[11px] text-muted">{s.gate ?? "Help desk"}</span>
                <span className="ml-auto flex items-center gap-3">
                  <span className="text-right text-[11px] leading-tight text-dim">
                    <strong className="block text-[13px] text-text">{s.scans} scans</strong>
                    {s.lastScan ? `last ${s.lastScan}` : "none yet"}
                  </span>
                  <Badge tone={statusTone[s.status]} dot={s.status === "active"}>
                    {statusLabel[s.status]}
                  </Badge>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-6" aria-label="What each role can do">
        <h3 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-dim">What each role can do</h3>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[26rem] text-left text-xs">
            <thead className="bg-surface-2 text-[10px] uppercase tracking-wider text-dim">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-bold">
                  Permission
                </th>
                {(Object.keys(roleMeta) as StaffRole[]).map((r) => (
                  <th key={r} scope="col" className="px-3 py-2.5 text-center font-bold">
                    {roleMeta[r].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissionLabels.map((p) => (
                <tr key={p.key} className="border-t border-line">
                  <th scope="row" className="px-4 py-2.5 font-normal text-muted">
                    {p.label}
                  </th>
                  {(Object.keys(roleMeta) as StaffRole[]).map((r) => (
                    <td key={r} className="px-3 py-2.5 text-center">
                      {roleMeta[r].can[p.key] ? (
                        <Check size={14} aria-label="Allowed" className="mx-auto text-success" />
                      ) : (
                        <Minus size={14} aria-label="Not allowed" className="mx-auto text-dim" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <StaffDialog
        target={editing}
        onClose={() => setEditing(null)}
        onSave={(s, isNew) => {
          (isNew ? onAdd : onUpdate)(s);
          setEditing(null);
        }}
      />

      <Dialog open={removing !== null} onClose={() => setRemoving(null)} title="Remove this person?">
        {removing && (
          <>
            <p className="text-sm leading-relaxed text-muted">
              <strong className="text-text">{removing.name}</strong> will lose access to the scanner straight away. Scans they
              already made stay in the record.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setRemoving(null)}>
                Keep
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  onRemove(removing);
                  setRemoving(null);
                }}
              >
                Remove access
              </Button>
            </div>
          </>
        )}
      </Dialog>
    </Panel>
  );
}

function StaffDialog({
  target,
  onClose,
  onSave,
}: {
  target: StaffMember | "new" | null;
  onClose: () => void;
  onSave: (s: StaffMember, isNew: boolean) => void;
}) {
  const isNew = target === "new";
  const base: StaffMember | null =
    target === null
      ? null
      : target === "new"
        ? { id: "", name: "", contact: "", role: "scanner", gate: GATES[0], status: "invited", scans: 0, accessFrom: "16:30", accessUntil: "23:30" }
        : target;

  return (
    <Dialog open={target !== null} onClose={onClose} title={isNew ? "Add event staff" : "Edit staff access"}>
      {base && <StaffForm key={base.id || "new"} base={base} isNew={isNew} onClose={onClose} onSave={onSave} />}
    </Dialog>
  );
}

function StaffForm({
  base,
  isNew,
  onClose,
  onSave,
}: {
  base: StaffMember;
  isNew: boolean;
  onClose: () => void;
  onSave: (s: StaffMember, isNew: boolean) => void;
}) {
  const [name, setName] = useState(base.name);
  const [contact, setContact] = useState(base.contact);
  const [role, setRole] = useState<StaffRole>(base.role);
  const [gate, setGate] = useState<string>(base.gate ?? GATES[0]);
  const [from, setFrom] = useState(base.accessFrom);
  const [until, setUntil] = useState(base.accessUntil);
  const [suspended, setSuspended] = useState(base.status === "suspended");
  const [errors, setErrors] = useState<{ name?: string; contact?: string; window?: string }>({});

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!name.trim()) next.name = "Enter their name.";
    if (!looksLikeContact(contact.trim())) next.contact = "Enter an email address or a mobile number.";
    if (!from || !until || from >= until) next.window = "Access must end after it starts.";
    setErrors(next);
    if (Object.keys(next).length) return;

    // TODO: the API sends the invite and enforces the access window server-side.
    onSave(
      {
        ...base,
        id: base.id || newId("staff"),
        name: name.trim(),
        contact: contact.trim(),
        role,
        gate: role === "support" ? null : gate,
        status: isNew ? "invited" : suspended ? "suspended" : base.status === "suspended" ? "active" : base.status,
        accessFrom: from,
        accessUntil: until,
      },
      isNew,
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field label="Full name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} autoComplete="off" />
      <Field
        label="Email or mobile number"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        error={errors.contact}
        hint={isNew ? "We send them a private invite link here." : undefined}
        autoComplete="off"
      />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="staff-role" className="mb-2 block text-xs font-bold text-muted">
            Role
          </label>
          <Select
            id="staff-role"
            value={role}
            onChange={(e) => setRole(e.target.value as StaffRole)}
            className="h-12 w-full rounded-lg border border-line bg-surface px-3 text-sm text-text focus:border-gold focus:outline-none"
          >
            {(Object.keys(roleMeta) as StaffRole[]).map((r) => (
              <option key={r} value={r}>
                {roleMeta[r].label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="staff-gate" className="mb-2 block text-xs font-bold text-muted">
            Door
          </label>
          <Select
            id="staff-gate"
            value={gate}
            disabled={role === "support"}
            onChange={(e) => setGate(e.target.value)}
            className="h-12 w-full rounded-lg border border-line bg-surface px-3 text-sm text-text focus:border-gold focus:outline-none disabled:opacity-50"
          >
            {GATES.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </Select>
        </div>
      </div>
      <p className="-mt-1 text-[11px] leading-relaxed text-dim">{roleMeta[role].summary}</p>

      <fieldset>
        <legend className="mb-2 text-xs font-bold text-muted">Access on the event day</legend>
        <div className="grid grid-cols-2 gap-4">
          <Field label="From" type="time" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Field label="Until" type="time" value={until} onChange={(e) => setUntil(e.target.value)} />
        </div>
        {errors.window ? (
          <p className="mt-1.5 text-xs text-danger">{errors.window}</p>
        ) : (
          <p className="mt-1.5 text-[11px] text-dim">
            {formatClock(from)} to {formatClock(until)}. Access switches off by itself afterwards.
          </p>
        )}
      </fieldset>

      {!isNew && base.status !== "invited" && (
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-surface-2 p-3 text-xs text-muted">
          <input
            type="checkbox"
            checked={suspended}
            onChange={(e) => setSuspended(e.target.checked)}
            className="checkbox-box mt-0.5 size-[18px] shrink-0 cursor-pointer appearance-none rounded border border-line bg-surface checked:border-amber checked:bg-amber focus-visible:focus-ring"
          />
          <span>
            <strong className="flex items-center gap-1.5 text-text">
              <Ban size={12} aria-hidden /> Suspend access
            </strong>
            <span className="mt-1 block">Pause this person without removing them. You can switch it back on.</span>
          </span>
        </label>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">
          {isNew ? (
            <>
              <Mail size={15} aria-hidden /> Send invite
            </>
          ) : (
            <>
              <UserCheck size={15} aria-hidden /> Save access
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
