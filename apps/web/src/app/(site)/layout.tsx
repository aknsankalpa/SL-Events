import { Suspense } from "react";
import { EventsCatalogProvider } from "@/components/events/EventsCatalog";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { OfflineBanner } from "@/components/layout/OfflineBanner";
import { SiteNotices } from "@/components/layout/SiteNotices";
import { listEvents } from "@/server/events";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  // The events customers can browse, from the database (cached for a few minutes, refreshed when events change).
  const events = await listEvents();
  return (
    <EventsCatalogProvider events={events}>
      <OfflineBanner />
      <SiteNotices />
      {/* The header reads the current path, so routes with runtime params need it inside a Suspense boundary. */}
      <Suspense fallback={<div className="h-[88px] border-b border-line bg-page" aria-hidden />}>
        <Header />
      </Suspense>
      <main className="flex-1">{children}</main>
      <Footer />
    </EventsCatalogProvider>
  );
}
