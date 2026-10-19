import type { Metadata } from "next";
import { SearchX } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Page not found" };

/** A link that goes nowhere. */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-5 text-center">
      <SearchX size={30} aria-hidden className="text-dim" />
      <h1 className="mt-5 font-display text-3xl font-bold text-text">We can&apos;t find that page</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">The link may be old or mistyped. Try the events list, or head back home.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <LinkButton href="/events">Explore events</LinkButton>
        <LinkButton href="/" variant="outline">
          Go home
        </LinkButton>
      </div>
    </main>
  );
}
