import type { Metadata } from "next";
import { SplashRedirect } from "@/components/splash/SplashRedirect";
import { Logo } from "@/components/ui/Logo";

export const metadata: Metadata = { title: "Welcome" };

export default function SplashPage() {
  return (
    <div className="relative flex min-h-screen flex-1 flex-col items-center justify-center overflow-hidden bg-black px-5">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(50%_80%_at_50%_100%,rgb(110_0_0/0.55),transparent_70%)]" />

      <div className="relative flex flex-col items-center">
        <Logo height={240} href="" priority />
        <p className="mt-6 text-xs font-bold uppercase tracking-widest text-amber">Discover · Book · Experience</p>

        <div className="mt-8 w-64" role="progressbar" aria-label="Loading events near you" aria-busy="true">
          <div className="h-1 overflow-hidden rounded-full bg-line">
            <div className="splash-bar h-full rounded-full bg-gradient-to-r from-gold to-amber" />
          </div>
          <p className="mt-3 text-center text-xs text-dim">Loading events near you</p>
        </div>
      </div>

      <div className="absolute bottom-8 text-center text-xs text-muted">
        <p>Sri Lankan events and entertainment in Korea</p>
        <p className="mt-1 text-dim">Version 1.0</p>
      </div>

      <SplashRedirect to="/" afterMs={2600} />
    </div>
  );
}
