"use client";

import { useMemo, useSyncExternalStore } from "react";
import { EyeOff } from "lucide-react";
import { EventDetailsView } from "@/components/events/EventDetailsView";
import { getEvent } from "@/lib/data";
import { getServerSnapshot, getSnapshot, subscribe } from "@/lib/organizerStore";
import { draftToEventItem } from "@/lib/previewEvent";

/** Sample organizer events that correspond to an event on the public site. */
const publicSlugFor: Record<string, string> = {
  "music-night": "sri-lankan-music-night",
  "baila-night": "baila-night",
};

/**
 * Renders an organizer's event exactly as the public event page would (and nothing else), from the saved draft.
 * It reads the same browser store as the organizer portal, so it works inside the preview frame.
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
      return { event: draftToEventItem(draftEvent.draft, id), coverUrl: draftEvent.draft.coverUrl || undefined };
    }
    const slug = publicSlugFor[id];
    const live = slug ? getEvent(slug) : undefined;
    if (live) return { event: live, coverUrl: undefined };
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

  return <EventDetailsView event={view.event} preview coverUrl={view.coverUrl} />;
}
