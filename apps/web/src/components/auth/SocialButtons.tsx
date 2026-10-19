import { Globe } from "lucide-react";

/** Placeholder for "Continue with Google" until OAuth is wired to the backend. */
export function SocialButtons() {
  return (
    <>
      <div className="my-6 flex items-center gap-4 text-xs text-dim">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>
      <button
        type="button"
        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-line bg-black text-[13px] font-bold text-text transition-colors hover:border-gold/50 focus-visible:focus-ring"
      >
        <Globe size={16} aria-hidden /> Continue with Google
      </button>
    </>
  );
}
