"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Camera, CheckCircle2, Keyboard, Link2, ScanLine, ShieldAlert, XCircle, TriangleAlert } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/Button";
import { gates, type ScanOutcome, type ScanRecord } from "@/lib/organizer";
import { useEventData } from "./useEventData";
import { useOrganizer } from "./OrganizerContext";
import { useEventOps } from "./operations/useEventOps";
import { EventPicker, OrgPageHeader, Panel } from "./ui";
import { Select } from "@/components/ui/Select";

type Result = {
  outcome: ScanOutcome;
  title: string;
  name?: string;
  detail?: string;
  note?: string;
};

/** What the server answers for a scanned code (POST /api/staff/checkin). */
type CheckIn = {
  outcome?: "admitted" | "already_used" | "not_found" | "wrong_event" | "not_paid" | "cancelled" | "too_early" | "too_late";
  opensAt?: string;
  cutoffAt?: string;
  holder?: string;
  ticket?: string;
  seat?: string;
  booking?: string;
  scannedAt?: string;
  eventTitle?: string;
  error?: string;
};
type DoorData = {
  stats: { total: number; checkedIn: number; refusedScans: number };
  recentScans: { outcome: string; holder?: string; ticket?: string; at: string }[];
};

const outcomeStyles: Record<ScanOutcome, { badge: string; label: string }> = {
  admit: { badge: "bg-success/15 text-success", label: "Admit" },
  already_used: { badge: "bg-danger/15 text-danger", label: "Already used" },
  wrong_event: { badge: "bg-amber/15 text-amber", label: "Wrong event" },
  not_found: { badge: "bg-danger/15 text-danger", label: "Not found" },
};

type DetectorLike = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };

/** A short tone (and a buzz where supported) so staff know the result without looking. */
function feedback(kind: "admit" | "refuse") {
  try {
    navigator.vibrate?.(kind === "admit" ? 40 : [90, 50, 90]);
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = kind === "admit" ? 880 : 220;
    gain.gain.value = 0.08;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (kind === "admit" ? 0.12 : 0.3));
    osc.onended = () => void ctx.close();
  } catch {
    /* audio blocked until the user interacts with the page; the visual result is enough */
  }
}

const noopSubscribe = () => () => undefined;

function useBrowserValue<T>(read: () => T, serverValue: T): T {
  return useSyncExternalStore(noopSubscribe, read, () => serverValue);
}

export function ScannerPage() {
  const { event } = useOrganizer();
  // The organizer's event-day rules for the selected event: name privacy, re-entry, sound.
  const { ops } = useEventOps(event.id);
  const { settings } = ops;
  const [gate, setGate] = useState(gates[0]!);
  const [code, setCode] = useState("");
  const [result, setResult] = useState<Result>();
  // Figures and the latest scans come from the server, so every scanner at the door sees the same numbers.
  const { data: door, reload } = useEventData<DoorData>(event.id ? `/api/organizer/events/${encodeURIComponent(event.id)}/attendees` : null);
  const [busy, setBusy] = useState(false);
  const counts = {
    checkedIn: door?.stats.checkedIn ?? 0,
    remaining: Math.max(0, (door?.stats.total ?? 0) - (door?.stats.checkedIn ?? 0)),
    rejected: door?.stats.refusedScans ?? 0,
  };
  const scans: ScanRecord[] = (door?.recentScans ?? []).slice(0, 6).map((x) => ({
    outcome: x.outcome === "admitted" ? "admit" : x.outcome === "already_used" || x.outcome === "wrong_event" ? (x.outcome as ScanOutcome) : "not_found",
    name: settings.showGuestNames ? (x.holder ?? "Unknown code") : "Guest",
    detail: x.ticket ?? "—",
    time: new Date(x.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Seoul" }),
  }));
  const [cameraState, setCameraState] = useState<"off" | "starting" | "on" | "error">("off");
  const [cameraNote, setCameraNote] = useState<string>();
  const [copied, setCopied] = useState(false);
  const origin = useBrowserValue(() => window.location.origin, "");
  const canDetect = useBrowserValue(() => "BarcodeDetector" in window, false);
  const link = origin ? `${origin}/organizer/scanner?gate=${encodeURIComponent(gate)}` : "";

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastRead = useRef<{ value: string; at: number }>({ value: "", at: 0 });

  /**
   * Asks the server about the code. The server admits each ticket once, even with several scanners at the door, and
   * logs every scan. Re-entry is this event's own rule: a ticket already used is let back in when it is allowed.
   */
  const check = useCallback(
    async (raw: string) => {
      const value = raw.trim().toUpperCase();
      if (!value || !event.id) return;
      setBusy(true);
      let r: CheckIn;
      try {
        const res = await fetch("/api/staff/checkin", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ eventId: event.id, code: value, gate }),
          credentials: "same-origin",
          cache: "no-store",
        });
        r = (await res.json().catch(() => ({}))) as CheckIn;
      } catch {
        r = { error: "We couldn't reach SL Events. Check the connection and scan again." };
      }
      setBusy(false);

      const who = (name?: string) => (settings.showGuestNames ? name : undefined);
      const ticket = [r.ticket, r.seat ? `Seat ${r.seat}` : ""].filter(Boolean).join(" · ");
      const detail = settings.showGuestNames && ticket ? `${ticket} · ${value}` : ticket || undefined;
      const idReminder = /student/i.test(r.ticket ?? "") && settings.studentIdCheck ? " Check their student ID before letting them in." : "";
      let next: Result;
      if (!r.outcome) next = { outcome: "not_found", title: "Couldn't check", note: r.error ?? "Try again." };
      else if (r.outcome === "admitted") next = { outcome: "admit", title: "Admit", name: who(r.holder), detail, note: `Booking ${r.booking} checked in.${idReminder}` };
      else if (r.outcome === "already_used" && settings.allowReentry)
        next = { outcome: "admit", title: "Admit (re-entry)", name: who(r.holder), detail, note: `Re-entry is allowed for this event. First scanned ${r.scannedAt ?? "earlier"}.${idReminder}` };
      else if (r.outcome === "already_used") next = { outcome: "already_used", title: "Already used", name: who(r.holder), detail, note: `This ticket was already scanned${r.scannedAt ? ` (${r.scannedAt})` : ""}.` };
      else if (r.outcome === "wrong_event") next = { outcome: "wrong_event", title: "Wrong event", name: who(r.holder), detail: r.eventTitle, note: "This ticket is for a different event." };
      else if (r.outcome === "not_paid") next = { outcome: "not_found", title: "Not paid", name: who(r.holder), detail, note: "This booking isn't paid yet, so the ticket isn't valid." };
      else if (r.outcome === "cancelled") next = { outcome: "not_found", title: "Not valid", name: who(r.holder), detail, note: "This ticket was cancelled." };
      else if (r.outcome === "too_early") next = { outcome: "not_found", title: "Too early", note: `Check-in opens ${r.opensAt ?? "later"}. Ask the guest to wait.` };
      else if (r.outcome === "too_late") next = { outcome: "not_found", title: "Too late", note: `Entry closed ${r.cutoffAt ?? "earlier"} (the late cut-off for this event).` };
      else next = { outcome: "not_found", title: "Not valid", note: "No ticket with that code." };

      setResult(next);
      if (settings.soundFeedback) feedback(next.outcome === "admit" ? "admit" : "refuse");
      void reload();
    },
    [event.id, gate, settings, reload],
  );

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraState("off");
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  async function startCamera() {
    setCameraNote(undefined);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState("error");
      setCameraNote("This browser can't use the camera here. Type the ticket code instead.");
      return;
    }
    setCameraState("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
      setCameraState("on");
    } catch {
      setCameraState("error");
      setCameraNote("Camera access was blocked. Allow it in your browser, or type the ticket code instead.");
    }
  }

  // Decode frames while the camera is on, if the browser supports BarcodeDetector.
  useEffect(() => {
    if (cameraState !== "on" || !canDetect) return;
    const Detector = (window as unknown as { BarcodeDetector: new (o: { formats: string[] }) => DetectorLike }).BarcodeDetector;
    const detector = new Detector({ formats: ["qr_code"] });
    let stopped = false;
    const tick = async () => {
      const video = videoRef.current;
      if (stopped || !video || video.readyState < 2) return;
      try {
        const found = await detector.detect(video);
        const value = found[0]?.rawValue;
        const now = Date.now();
        if (value && (value !== lastRead.current.value || now - lastRead.current.at > 3000)) {
          lastRead.current = { value, at: now };
          void check(value);
        }
      } catch {
        /* a frame failed to decode; try the next one */
      }
    };
    const id = setInterval(tick, 400);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [cameraState, canDetect, check]);

  function copyLink() {
    navigator.clipboard
      .writeText(link)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      })
      .catch(() => undefined);
  }

  const style = result ? outcomeStyles[result.outcome] : undefined;

  return (
    <>
      <OrgPageHeader
        crumbs={[{ label: event.title }, { label: "QR scanner" }]}
        title="QR scanner"
        actions={
          <>
            <EventPicker />
            <label className="relative block">
              <span className="sr-only">Entrance</span>
              <Select
                value={gate}
                onChange={(e) => setGate(e.target.value)}
                className="h-[3.25rem] rounded-xl border border-line bg-surface pl-4 pr-3 text-[13px] text-text focus:border-gold focus:outline-none"
              >
                {gates.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </Select>
            </label>
          </>
        }
      />

      <div className="grid items-start gap-5 xl:grid-cols-[1fr_20.5rem]">
        <div className="space-y-4">
          <Panel className="relative flex aspect-[4/3] max-h-[26rem] w-full items-center justify-center overflow-hidden bg-black sm:aspect-[16/10]">
            <video
              ref={videoRef}
              playsInline
              muted
              className={`absolute inset-0 size-full object-cover ${cameraState === "on" ? "" : "hidden"}`}
            />
            <div aria-hidden className="pointer-events-none absolute inset-[18%] sm:inset-x-[28%] sm:inset-y-[18%]">
              {["left-0 top-0 border-l-4 border-t-4 rounded-tl-xl", "right-0 top-0 border-r-4 border-t-4 rounded-tr-xl", "left-0 bottom-0 border-l-4 border-b-4 rounded-bl-xl", "right-0 bottom-0 border-r-4 border-b-4 rounded-br-xl"].map(
                (c) => (
                  <span key={c} className={`absolute size-12 border-gold ${c}`} />
                ),
              )}
            </div>
            {cameraState !== "on" && (
              <div className="relative z-10 flex flex-col items-center gap-3 px-6 text-center">
                <ScanLine size={26} aria-hidden className="text-text" />
                <p className="text-[13px] font-bold text-text">Hold a ticket QR code up to the camera</p>
                <p className="text-[11px] text-dim">
                  {cameraState === "starting" ? "Starting camera…" : cameraNote ?? "Camera is off"}
                </p>
                <Button size="sm" onClick={startCamera} disabled={cameraState === "starting"}>
                  <Camera size={14} aria-hidden /> Use camera
                </Button>
              </div>
            )}
            {cameraState === "on" && (
              <button
                type="button"
                onClick={stopCamera}
                className="absolute bottom-3 right-3 z-10 rounded-lg bg-black/70 px-3 py-2 text-xs font-bold text-text"
              >
                Stop camera
              </button>
            )}
          </Panel>
          {cameraState === "on" && !canDetect && (
            <p className="text-xs text-amber">Live scanning isn&apos;t supported in this browser. Type the ticket code below.</p>
          )}

          <form
            className="flex gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void check(code);
              setCode("");
            }}
          >
            <label className="flex h-12 flex-1 items-center gap-3 rounded-xl border border-line bg-surface px-4 focus-within:border-gold">
              <Keyboard size={16} aria-hidden className="text-dim" />
              <span className="sr-only">Ticket code</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Type a ticket code, e.g. SLE-7K3F-92QD"
                autoCapitalize="characters"
                autoComplete="off"
                className="w-full bg-transparent font-mono text-sm text-text placeholder:font-sans placeholder:text-dim focus:outline-none"
              />
            </label>
            <Button type="submit" variant="outline" size="lg" disabled={busy} className="border-line text-text hover:bg-surface-2">
              {busy ? "Checking…" : "Check code"}
            </Button>
          </form>

          <Panel className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
            <div className="shrink-0 rounded-lg bg-white p-2">
              {link ? <QRCodeSVG value={link} size={72} level="M" marginSize={0} title="Scanner link" /> : <span className="block size-[72px]" />}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-[13px] font-bold text-text">Scan with more phones</p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-dim">
                Your organizer team can scan this code to open the scanner on their phone after logging in. Door staff without an organizer login use the scanner in the SL Events app.
              </p>
            </div>
            <Button variant="outline" size="sm" className="border-line text-text hover:bg-surface-2" onClick={copyLink}>
              <Link2 size={14} aria-hidden /> {copied ? "Copied" : "Copy link"}
            </Button>
          </Panel>
        </div>

        <div className="space-y-4">
          <section
            aria-live="polite"
            className={`rounded-xl border-2 p-5 ${
              result
                ? result.outcome === "admit"
                  ? "border-success/70 bg-success/10"
                  : result.outcome === "wrong_event"
                    ? "border-amber/70 bg-amber/10"
                    : "border-danger/70 bg-danger/10"
                : "border-line bg-surface"
            }`}
          >
            {result && style ? (
              <>
                <p
                  className={`flex items-center gap-3 font-display text-2xl font-bold ${
                    result.outcome === "admit" ? "text-success" : result.outcome === "wrong_event" ? "text-amber" : "text-danger"
                  }`}
                >
                  {result.outcome === "admit" ? <CheckCircle2 size={26} aria-hidden /> : result.outcome === "wrong_event" ? <TriangleAlert size={26} aria-hidden /> : <XCircle size={26} aria-hidden />}
                  {result.title}
                </p>
                {result.name && <p className="mt-4 text-xl font-bold text-text">{result.name}</p>}
                {result.detail && <p className="mt-1.5 font-mono text-sm text-text">{result.detail}</p>}
                {result.note && <p className="mt-3 text-[11px] text-muted">{result.note}</p>}
              </>
            ) : (
              <p className="flex items-center gap-3 text-sm text-muted">
                <ShieldAlert size={18} aria-hidden /> Scan a ticket to see the result here.
              </p>
            )}
          </section>

          <div className="grid grid-cols-3 gap-3">
            {[
              ["Checked in", counts.checkedIn],
              ["Still to arrive", counts.remaining],
              ["Rejected", counts.rejected],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-line bg-surface p-3.5">
                <p className="text-[11px] text-dim">{label}</p>
                <p className="mt-2 text-xl font-bold text-text">{value}</p>
              </div>
            ))}
          </div>

          <Panel className="overflow-hidden">
            <h2 className="p-5 pb-3 text-base font-bold text-text">Recent scans</h2>
            <ul>
              {scans.map((s, i) => (
                <li key={`${s.time}-${s.name}-${i}`} className="flex items-center gap-3 border-t border-line px-5 py-3">
                  <span className={`w-[5.5rem] shrink-0 rounded-full px-2 py-1 text-center text-[10px] font-bold uppercase ${outcomeStyles[s.outcome].badge}`}>
                    {outcomeStyles[s.outcome].label}
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-[13px] font-bold text-text">{s.name}</span>
                    <span className="mt-0.5 block text-[11px] text-dim">{s.detail}</span>
                  </span>
                  <span className="shrink-0 text-[11px] text-dim">{s.time}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
