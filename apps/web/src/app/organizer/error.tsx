"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** Everything the organizer area keeps in this browser until the backend exists. */
function clearSavedData() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key?.startsWith("sl-events:")) keys.push(key);
    }
    keys.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* storage blocked: nothing to clear */
  }
}

export default function OrganizerError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-danger/15 text-danger">
        <AlertTriangle size={26} aria-hidden />
      </span>
      <h1 className="mt-5 font-display text-2xl font-bold text-text">This page couldn&apos;t load</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Something went wrong while showing this page. Try again first. If it keeps happening, the draft events and
        settings saved in this browser may be out of date, and clearing them will fix it.
      </p>
      <p className="mt-3 max-w-full break-words rounded-lg border border-line bg-surface px-3 py-2 text-xs text-dim">
        {error.message || "Unknown error"}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button onClick={() => retry()}>Try again</Button>
        <Button
          variant="outline"
          onClick={() => {
            clearSavedData();
            window.location.reload();
          }}
        >
          Clear saved data and reload
        </Button>
      </div>
      <p className="mt-3 text-xs text-dim">Clearing removes draft events, profile edits and staff changes made in this browser.</p>
    </div>
  );
}
