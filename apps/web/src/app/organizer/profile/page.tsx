import type { Metadata } from "next";
import { ProfilePage } from "@/components/organizer/ProfilePage";

export const metadata: Metadata = { title: "Organizer profile" };

export default function OrganizerProfilePage() {
  return <ProfilePage />;
}
