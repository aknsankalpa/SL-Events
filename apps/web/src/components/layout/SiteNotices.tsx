"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Wrench } from "lucide-react";
import { configStore } from "@/lib/adminStore";

const noSubscribe = () => () => undefined;

/** The announcement banner and maintenance notice that an admin saves in the admin portal. Nothing shows until one is published. */
export function SiteNotices() {
  const { banner, bannerPublished, maintenance } = useSyncExternalStore(configStore.subscribe, configStore.getSnapshot, configStore.getServerSnapshot);
  // Today's date is read in the browser only, so the prerendered page never depends on the build time.
  const today = useSyncExternalStore(noSubscribe, () => new Date().toLocaleDateString("en-CA"), () => "");
  const showBanner = !!today && bannerPublished && banner.live && !!banner.message && (!banner.from || banner.from <= today) && (!banner.to || today <= banner.to);

  return (
    <>
      {maintenance.on && (
        <div role="status" className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-amber px-4 py-2 text-center text-xs font-bold text-ink">
          <Wrench size={14} aria-hidden /> {maintenance.message}
          {maintenance.window && <span className="font-normal">({maintenance.window})</span>}
        </div>
      )}
      {showBanner && (
        <div role="region" aria-label="Announcement" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 bg-danger px-4 py-2.5 text-center text-[13px] text-white">
          <span>{banner.message}</span>
          {banner.button && (
            <Link href={banner.link || "/"} className="rounded-md bg-white/20 px-3 py-1 text-xs font-bold hover:bg-white/30">
              {banner.button}
            </Link>
          )}
        </div>
      )}
    </>
  );
}
