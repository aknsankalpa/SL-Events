import type { Metadata } from "next";
import { ScannerPage } from "@/components/organizer/ScannerPage";

export const metadata: Metadata = { title: "QR scanner" };

export default function OrganizerScannerPage() {
  return <ScannerPage />;
}
