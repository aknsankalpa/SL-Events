import { RequireCustomer } from "@/components/auth/RequireCustomer";

/** Customer-only area: visitors who are not signed in are sent to log in first. */
export default function CustomerOnlyLayout({ children }: { children: React.ReactNode }) {
  return <RequireCustomer>{children}</RequireCustomer>;
}
