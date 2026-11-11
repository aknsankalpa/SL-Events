import type { Metadata } from "next";
import { RequireRole } from "@/components/auth/RequireRole";
import { OrganizerShell } from "@/components/organizer/OrganizerShell";

export const metadata: Metadata = {
  title: { default: "Organizer", template: "%s · SL Events Organizer" },
  robots: { index: false },
};

/** The portal waits for the sign-in check before showing anything, so a navigation into it is allowed to wait. */
export const instant = false;

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole role="organizer">
      <OrganizerShell>{children}</OrganizerShell>
    </RequireRole>
  );
}
