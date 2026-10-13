import { Suspense } from "react";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* The header reads the current path, so routes with runtime params need it inside a Suspense boundary. */}
      <Suspense fallback={<div className="h-[88px] border-b border-line bg-page" aria-hidden />}>
        <Header />
      </Suspense>
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
