import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/LegalPage";

export const metadata: Metadata = { title: "Terms of use" };

export default function TermsPage() {
  return <LegalPage title="Terms of use" />;
}
