import { AccountSidebar } from "@/components/layout/AccountSidebar";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto grid max-w-site items-start gap-8 px-5 py-8 lg:grid-cols-[15.5rem_1fr]">
      <AccountSidebar />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
