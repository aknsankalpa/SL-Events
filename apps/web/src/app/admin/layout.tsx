import type { Metadata } from "next";
import { RequireRole } from "@/components/auth/RequireRole";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · SL Events Admin" },
  robots: { index: false, follow: false },
};

/** The portal waits for the sign-in check before showing anything, so a navigation into it is allowed to wait. */
export const instant = false;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole role="admin">
      <AdminShell>{children}</AdminShell>
    </RequireRole>
  );
}
