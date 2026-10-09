import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/LegalPage";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return <LegalPage title="Privacy policy" />;
}
