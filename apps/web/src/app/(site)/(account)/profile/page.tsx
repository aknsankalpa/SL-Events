import type { Metadata } from "next";
import { ProfileForm } from "@/components/account/ProfileForm";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return <ProfileForm />;
}
