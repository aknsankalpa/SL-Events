"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/Button";

/** Something broke while showing a page. The header and footer stay, and there's a way forward. */
export default function SiteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-5 py-24 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-danger/15 text-danger">
        <AlertTriangle size={26} aria-hidden />
      </span>
      <h1 className="mt-5 font-display text-2xl font-bold text-text">Something went wrong</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        We couldn&apos;t show this page. Your bookings and tickets are safe. Try again, or go back to the home page.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button onClick={() => retry()}>Try again</Button>
        <LinkButton href="/" variant="outline">
          Go home
        </LinkButton>
      </div>
      <p className="mt-6 text-xs text-dim">
        Still stuck?{" "}
        <a href="/contact" className="font-bold text-amber hover:text-gold">
          Contact support
        </a>
      </p>
    </div>
  );
}
