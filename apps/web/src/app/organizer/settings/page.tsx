import type { Metadata } from "next";
import { User } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { OrgPageHeader, Panel } from "@/components/organizer/ui";

export const metadata: Metadata = { title: "Settings" };

/** Placeholder: the Figma file has no Settings screen. Account and notification options live in the profile. */
export default function OrganizerSettingsPage() {
  return (
    <>
      <OrgPageHeader crumbs={[{ label: "Settings" }]} title="Settings" />
      <Panel className="p-8 text-center">
        <p className="mx-auto max-w-md text-sm leading-relaxed text-muted">
          Your details, organization, payout account, notifications and security are all in your profile. Team and billing
          settings will appear here once they are designed.
        </p>
        <LinkButton href="/organizer/profile" className="mt-5">
          <User size={16} aria-hidden /> Open your profile
        </LinkButton>
      </Panel>
    </>
  );
}
