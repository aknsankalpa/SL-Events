"use client";

import { useEffect, useState } from "react";
import { EyeOff, Loader2 } from "lucide-react";
import { EventDetailsView } from "@/components/events/EventDetailsView";
import type { EventItem } from "@/lib/data";
import type { OrganizerEvent } from "@/lib/organizer";
import { draftToEventItem } from "@/lib/previewEvent";

type View = { event: EventItem; coverUrl?: string } | "missing" | null;

/**
 * Renders an organizer's event exactly as the public event page would (and nothing else), from what is saved on the
 * server. Its organizer and admins (who review it) can open it; anyone else is told there is nothing to preview.
 */
export function DraftPreview({ id }: { id: string }) {
  const [view, setView] = useState<View>(null);

  useEffect(() => {
    let live = true;
    fetch(`/api/organizer/events/${encodeURIComponent(id)}`, { credentials: "same-origin", cache: "no-store" })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as { event?: OrganizerEvent };
        if (!live) return;
        const draft = data.event?.draft;
        setView(res.ok && draft ? { event: draftToEventItem(draft, id), coverUrl: draft.coverUrl || undefined } : "missing");
      })
      .catch(() => live && setView("missing"));
    return () => {
      live = false;
    };
  }, [id]);

  if (view === null) {
    return (
      <div role="status" className="mx-auto flex max-w-site items-center gap-3 px-5 py-16 text-sm text-muted">
        <Loader2 size={16} aria-hidden className="animate-spin text-gold" /> Loading preview…
      </div>
    );
  }

  if (view === "missing") {
    return (
      <div className="mx-auto max-w-site px-5 py-20 text-center">
        <EyeOff size={28} className="mx-auto text-dim" aria-hidden />
        <p className="mt-4 text-base font-bold text-text">There&apos;s nothing to preview here</p>
        <p className="mt-2 text-sm text-muted">The event doesn&apos;t exist, or you need to log in as its organizer (or an admin) to see it.</p>
      </div>
    );
  }

  return <EventDetailsView event={view.event} preview coverUrl={view.coverUrl} />;
}
