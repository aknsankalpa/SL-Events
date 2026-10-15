"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Camera, CheckCircle2, Keyboard, Link2, ScanLine, ShieldAlert, XCircle, TriangleAlert } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/Button";
import { attendees, gates, recentScans, type ScanOutcome, type ScanRecord } from "@/lib/organizer";
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

// Codes that belong to another event, so the demo can show the "wrong event" outcome.
const otherEventCodes: Record<string, { name: string; event: string }> = {
  "SLE-Q8JZ-5WRN": { name: "Roshan Pathirana", event: "Baila Night" },
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
  const [scans, setScans] = useState<ScanRecord[]>(recentScans);
  const [counts, setCounts] = useState({ checkedIn: 86, remaining: 142, rejected: 3 });
  const [cameraState, setCameraState] = useState<"off" | "starting" | "on" | "error">("off");
  const [cameraNote, setCameraNote] = useState<string>();
  const [copied, setCopied] = useState(false);
  const origin = useBrowserValue(() => window.location.origin, "");
  const canDetect = useBrowserValue(() => "BarcodeDetector" in window, false);
  const link = origin ? `${origin}/organizer/scanner?gate=${encodeURIComponent(gate)}` : "";

  const used = useRef(new Set<string>());
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastRead = useRef<{ value: string; at: number }>({ value: "", at: 0 });

  const check = useCallback(
    (raw: string) => {
      const value = raw.trim().toUpperCase();
      if (!value) return;

      const time = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      const holder = attendees.find((a) => a.code === value);
      const other = otherEventCodes[value];
      const who = (name: string) => (settings.showGuestNames ? name : undefined);
      const detailFor = (ticket: string, code: string) => (settings.showGuestNames ? `${ticket} · ${code}` : ticket);
      const idReminder = holder?.ticket === "Student" && settings.studentIdCheck ? " Check their student ID before letting them in." : "";

      let next: Result;
      if (other) {
        next = {
          outcome: "wrong_event",
          title: "Wrong event",
          name: who(other.name),
          detail: other.event,
          note: "This ticket is for a different event.",
        };
      } else if (!holder || holder.state === "cancelled") {
        next = { outcome: "not_found", title: "Not valid", note: holder ? "This ticket was cancelled." : "No ticket with that code." };
      } else if ((holder.state === "checked_in" || used.current.has(value)) && !settings.allowReentry) {
        next = {
          outcome: "already_used",
          title: "Already used",
          name: who(holder.name),
          detail: detailFor(holder.ticket, holder.code),
          note: "This ticket has already been scanned.",
        };
      } else {
        // TODO: the server must mark the ticket used in the same atomic step that returns "admit".
        const reentry = holder.state === "checked_in" || used.current.has(value);
        used.current.add(value);
        next = {
          outcome: "admit",
          title: reentry ? "Admit (re-entry)" : "Admit",
          name: who(holder.name),
          detail: detailFor(holder.ticket, holder.code),
          note: `${reentry ? "Re-entry allowed for this event." : `Booking ${holder.booking} checked in.`}${idReminder}`,
        };
      }

      setResult(next);
      if (settings.soundFeedback) feedback(next.outcome === "admit" ? "admit" : "refuse");
      setScans((s) =>
        [{ outcome: next.outcome, name: next.name ?? "Guest", detail: next.detail?.split(" · ")[0] ?? "—", time }, ...s].slice(0, 6),
      );
      setCounts((c) =>
        next.outcome === "admit"
          ? { ...c, checkedIn: c.checkedIn + 1, remaining: Math.max(0, c.remaining - 1) }
          : { ...c, rejected: c.rejected + 1 },
      );
    },
    [settings],
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
          check(value);
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
              check(code);
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
            <Button type="submit" variant="outline" size="lg" className="border-line text-text hover:bg-surface-2">
              Check code
            </Button>
          </form>

          <Panel className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
            <div className="shrink-0 rounded-lg bg-white p-2">
              {link ? <QRCodeSVG value={link} size={72} level="M" marginSize={0} title="Scanner link" /> : <span className="block size-[72px]" />}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-[13px] font-bold text-text">Scan with more phones</p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-dim">
                Door staff scan this code to open the scanner on their phone. No app needed. The link works until midnight.
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
