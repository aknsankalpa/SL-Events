import type { Metadata } from "next";
import { Suspense } from "react";
import { UsersPage } from "@/components/admin/UsersPage";

export const metadata: Metadata = { title: "Users and roles" };

export default function Page() {
  // Pages read the link (?tab=...), so they sit inside a Suspense boundary.
  return (
    <Suspense fallback={<div className="h-64" aria-hidden />}>
      <UsersPage />
    </Suspense>
  );
}
