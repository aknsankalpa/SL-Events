"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Calendar, CheckCircle2, Clock, FileText, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, EventThumb } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import type { Booking } from "@/lib/bookings";
import { customerActions } from "@/lib/bookingStore";
import { useSession } from "@/components/auth/useSession";
import { useOnline } from "@/components/layout/OfflineBanner";
import { currentUser, type EventItem } from "@/lib/data";
import { formatKrw } from "@/lib/format";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "application/pdf"];

type Upload = { file: File; previewUrl?: string; progress: number };

export function ProofUploadForm({ booking, event }: { booking: Booking; event: EventItem }) {
  const router = useRouter();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [upload, setUpload] = useState<Upload>();
  const [fileError, setFileError] = useState<string>();
  const [dragging, setDragging] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { user } = useSession();
  const online = useOnline();
  const [sender, setSender] = useState((user?.name ?? currentUser.fullName).toUpperCase());

  // Simulated progress: the real upload to storage is wired up once the API exists.
  useEffect(() => {
    if (!upload || upload.progress >= 100) return;
    const id = setTimeout(() => setUpload((u) => (u ? { ...u, progress: Math.min(100, u.progress + 20) } : u)), 120);
    return () => clearTimeout(id);
  }, [upload]);

  const previewUrl = upload?.previewUrl;
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function accept(file?: File) {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) return setFileError("Use a JPG, PNG or PDF file.");
    if (file.size > MAX_BYTES) return setFileError("That file is larger than 10 MB.");
    setFileError(undefined);
    setUpload({ file, progress: 0, previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
    if (!upload || upload.progress < 100 || !sender.trim()) return;
    const bank = String(new FormData(e.currentTarget).get("bank") ?? "").trim();
    // TODO: upload the receipt to storage and send the details to the API. The booking only becomes "under review":
    // it is marked paid when staff have checked the transfer, never from here.
    const ok = customerActions.submitProof(booking.id, {
      fileName: upload.file.name,
      sizeLabel: `${(upload.file.size / 1024 / 1024).toFixed(1)} MB`,
      sender: sender.trim(),
      bank,
    });
    router.push(ok ? `/bookings/${booking.id}?submitted=1` : `/bookings/${booking.id}`);
  }

  const size = upload ? `${(upload.file.size / 1024 / 1024).toFixed(1)} MB` : "";

  return (
    <form id="proof-form" onSubmit={onSubmit} noValidate className="mx-auto grid max-w-site gap-8 px-5 py-10 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-5">
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-bold text-text">Receipt screenshot</h2>

          <label
            htmlFor={inputId}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              accept(e.dataTransfer.files[0]);
            }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
              dragging ? "border-gold bg-gold/10" : "border-amber/40 hover:border-gold/70"
            }`}
          >
            <UploadCloud size={24} aria-hidden className="text-gold" />
            <p className="text-[13px] font-bold text-text">
              Drag a file here or <span className="text-gold underline-offset-2 hover:underline">browse</span>
            </p>
            <p className="text-[11px] text-dim">JPG, PNG or PDF · up to 10 MB</p>
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              className="sr-only"
              onChange={(e) => accept(e.target.files?.[0])}
            />
          </label>
          {fileError && <p className="mt-2 text-xs text-danger">{fileError}</p>}
          {submitted && !upload && !fileError && <p className="mt-2 text-xs text-danger">Add a screenshot of your transfer.</p>}

          {upload && (
            <div className="mt-4 flex items-center gap-4 rounded-xl border border-line bg-surface-2 p-3">
              {upload.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- local blob preview, not optimisable
                <img src={upload.previewUrl} alt="" className="size-14 rounded-md object-cover" />
              ) : (
                <span className="flex size-14 items-center justify-center rounded-md bg-surface text-muted">
                  <FileText size={22} aria-hidden />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-text">{upload.file.name}</p>
                <p className="mt-0.5 text-[11px] text-dim">
                  {size} · {upload.progress < 100 ? "Uploading…" : "Uploaded"}
                </p>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={upload.progress} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress">
                  <div className="h-full rounded-full bg-gradient-to-r from-gold to-amber transition-[width]" style={{ width: `${upload.progress}%` }} />
                </div>
              </div>
              <button
                type="button"
                aria-label="Remove file"
                onClick={() => {
                  setUpload(undefined);
                  if (inputRef.current) inputRef.current.value = "";
                }}
                className="self-start rounded p-1 text-muted hover:text-text"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-bold text-text">Transfer details</h2>
          <p className="mb-5 mt-1 text-xs text-dim">Enter them as they appear in your bank app.</p>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Sender name"
              name="sender"
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              hint="Exactly as it appears in your banking app."
              error={submitted && !sender.trim() ? "Enter the name on the sending account." : undefined}
            />
            <Field label="Bank or app you sent from (optional)" name="bank" placeholder="For example, the name of your bank" />
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-3">
            <Field label="Transfer date (optional)" name="date" type="date" icon={<Calendar />} />
            <Field label="Transfer time (optional)" name="time" type="time" icon={<Clock />} />
            <Field label="Amount sent" name="amount" defaultValue={formatKrw(booking.total)} inputMode="numeric" />
          </div>

          <div className="mt-5">
            <label htmlFor="note" className="mb-2 block text-xs font-bold text-muted">
              Note for our team (optional)
            </label>
            <textarea
              id="note"
              name="note"
              rows={3}
              placeholder="For example, if you paid from a friend's account"
              className="w-full resize-none rounded-lg border border-line bg-surface p-4 text-sm text-text placeholder:text-dim focus:border-gold focus:outline-none"
            />
          </div>
        </Card>
      </div>

      <div className="space-y-4 lg:sticky lg:top-[108px] lg:self-start">
        <Card className="p-6">
          <div className="mb-5 flex items-center justify-between text-xs">
            <span className="text-dim">Booking</span>
            <span className="font-mono font-bold text-text">{booking.id}</span>
          </div>
          <div className="flex items-center gap-4">
            <EventThumb category={event.category} size={52} />
            <div className="leading-tight">
              <p className="text-[13px] font-bold text-text">{event.title}</p>
              <p className="mt-1.5 text-[11px] text-dim">
                {event.longDate} · {event.time}
              </p>
              <p className="mt-0.5 text-[11px] text-dim">
                {event.venue}, {event.city}
              </p>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
            <span className="text-[13px] text-muted">Amount due</span>
            <span className="text-2xl font-bold text-text">{formatKrw(booking.total)}</span>
          </div>
          <Button type="submit" size="lg" className="mt-5 w-full" disabled={(!!upload && upload.progress < 100) || !online}>
            Submit proof
          </Button>
          {!online && <p role="alert" className="mt-3 text-center text-[11px] text-amber">You&apos;re offline. Reconnect to send your proof.</p>}
          <p className="mt-3 text-center text-[11px] text-dim">We usually check payments within 2–6 hours.</p>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-[13px] font-bold text-text">A good screenshot shows</h2>
          <div className="flex gap-4">
            <div aria-hidden className="w-24 shrink-0 rounded-lg bg-white p-2 text-center text-[7px] leading-tight text-slate-500">
              <span className="mx-auto mb-1 flex size-5 items-center justify-center rounded-full bg-blue-500 text-[10px] text-white">✓</span>
              <p className="text-[11px] font-bold text-slate-900">{formatKrw(booking.total)}</p>
              <p className="mb-1">Transfer complete</p>
              {["To · SL Events", `Memo · ${booking.id}`, "Status · Completed"].map((r) => (
                <p key={r} className="border-t border-slate-200 py-0.5 text-left">
                  {r}
                </p>
              ))}
            </div>
            <ul className="space-y-2.5">
              {[`The amount: ${formatKrw(booking.total)}`, "The receiving account", `The memo ${booking.id}`, "The date and time"].map((t) => (
                <li key={t} className="flex items-center gap-2 text-[11px] text-muted">
                  <CheckCircle2 size={14} aria-hidden className="shrink-0 text-success" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>
    </form>
  );
}
