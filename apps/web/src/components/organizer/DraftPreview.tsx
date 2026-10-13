"use client";

import { useMemo, useSyncExternalStore } from "react";
import { EyeOff } from "lucide-react";
import { EventDetailsView } from "@/components/events/EventDetailsView";
import { getEvent } from "@/lib/data";
import { organizerEvents } from "@/lib/organizer";
import { getServerSnapshot, getSnapshot, subscribe } from "@/lib/organizerStore";
import { draftToEventItem } from "@/lib/previewEvent";

/** Sample organizer events that correspond to an event on the public site. */
const publicSlugFor: Record<string, string> = {
  "music-night": "sri-lankan-music-night",
  "baila-night": "baila-night",
};

/**
 * Renders an organizer's event exactly as the public event page would, from the saved draft. It reads the same
 * browser store as the organizer portal, so it works inside the preview frame.
 */
export function DraftPreview({ id }: { id: string }) {
  const created = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const view = useMemo(() => {
    const draftEvent = created.find((e) => e.id === id);
    if (draftEvent?.draft) {
      return { event: draftToEventItem(draftEvent.draft, id), coverUrl: draftEvent.draft.coverUrl || undefined, status: draftEvent.status };
    }
    const slug = publicSlugFor[id];
    const live = slug ? getEvent(slug) : undefined;
    const known = organizerEvents.find((e) => e.id === id);
    if (live) return { event: live, coverUrl: undefined, status: known?.status ?? "on_sale" };
    return null;
  }, [created, id]);

  if (!hydrated) return <div className="mx-auto max-w-site px-5 py-16 text-sm text-muted">Loading preview…</div>;

  if (!view) {
    return (
      <div className="mx-auto max-w-site px-5 py-20 text-center">
        <EyeOff size={28} className="mx-auto text-dim" aria-hidden />
        <p className="mt-4 text-base font-bold text-text">There&apos;s nothing to preview here</p>
        <p className="mt-2 text-sm text-muted">
          This event has no saved content in this browser. Drafts are kept in the browser they were created in.
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="border-b border-amber/30 bg-amber/10 px-5 py-2 text-center text-xs font-bold text-amber">
        {view.status === "draft" ? "Draft preview" : view.status === "in_review" ? "Preview · in review" : "Live event"}
        <span className="font-normal text-muted"> · buyers can&apos;t see this page until it is published</span>
      </p>
      <EventDetailsView event={view.event} preview coverUrl={view.coverUrl} />
    </>
  );
}
