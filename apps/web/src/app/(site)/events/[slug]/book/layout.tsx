import { RequireCustomer } from "@/components/auth/RequireCustomer";

/**
 * Customer-only pages wait for the sign-in check before showing anything, so a navigation into them is allowed to wait.
 * (Without this, Next.js keeps re-validating the hidden page in development and reloads it.)
 */
export const instant = false;

/** Customer-only area: visitors who are not signed in are sent to log in first. */
export default function CustomerOnlyLayout({ children }: { children: React.ReactNode }) {
  return <RequireCustomer>{children}</RequireCustomer>;
}
