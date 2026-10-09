import { Globe, MessageCircle } from "lucide-react";

/** Placeholder buttons until OAuth (Google / Kakao) is wired up to the backend. */
export function SocialButtons() {
  return (
    <>
      <div className="my-6 flex items-center gap-4 text-xs text-dim">
        <span className="h-px flex-1 bg-line" />
        or continue with
        <span className="h-px flex-1 bg-line" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className="flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-black text-[13px] font-bold text-text transition-colors hover:border-gold/50 focus-visible:focus-ring"
        >
          <Globe size={16} aria-hidden /> Google
        </button>
        <button
          type="button"
          className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#fee500] text-[13px] font-bold text-black transition-[filter] hover:brightness-95 focus-visible:focus-ring"
        >
          <MessageCircle size={16} aria-hidden /> Kakao
        </button>
      </div>
    </>
  );
}
