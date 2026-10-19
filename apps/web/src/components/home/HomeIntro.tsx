"use client";

import { useSession } from "@/components/auth/useSession";
import { ActionBanner, Hero } from "./Hero";
import { PublicHero } from "./PublicHero";

/** The top of the home page: the public welcome for visitors, the "welcome back" view for signed-in customers. */
export function HomeIntro() {
  const { user, ready } = useSession();
  if (ready && user) {
    return (
      <>
        <ActionBanner />
        <Hero firstName={user.firstName} />
      </>
    );
  }
  return <PublicHero />;
}
