"use client";

import { useEffect } from "react";

/** The last line of defence: an error outside the site layout. Plain on purpose, so it can't fail in turn. */
export default function RootError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-5 text-center">
      <h1 className="font-display text-3xl font-bold text-text">Something went wrong</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">We couldn&apos;t load SL Events. Please try again in a moment.</p>
      <button
        type="button"
        onClick={() => retry()}
        className="mt-6 h-11 rounded-lg bg-gradient-to-b from-gold to-amber px-6 text-sm font-bold text-ink hover:brightness-110"
      >
        Try again
      </button>
    </main>
  );
}
