import type { Metadata } from "next";
import { OrgPageHeader, Panel } from "@/components/organizer/ui";

export const metadata: Metadata = { title: "Settings" };

/** Placeholder: the Figma file has no Settings screen yet. */
export default function OrganizerSettingsPage() {
  return (
    <>
      <OrgPageHeader crumbs={[{ label: "Settings" }]} title="Settings" />
      <Panel className="p-8 text-center text-sm text-muted">
        Organizer settings (profile, team members and payout details) will appear here once they are designed.
      </Panel>
    </>
  );
}
