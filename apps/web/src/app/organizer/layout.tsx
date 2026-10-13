import type { Metadata } from "next";
import { OrganizerShell } from "@/components/organizer/OrganizerShell";

export const metadata: Metadata = {
  title: { default: "Organizer", template: "%s · SL Events Organizer" },
  robots: { index: false },
};

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  return <OrganizerShell>{children}</OrganizerShell>;
}
