import { accountSnapshot } from "./account";

/**
 * Who a signed-in account is, in the one app that serves everyone. The roles come from the website (the account's
 * customer / organizer / door staff / admin access, checked there for every action); nobody signed in is a visitor.
 */
export type Role = "visitor" | "customer" | "staff" | "organizer" | "admin";

export const roleLabels: Record<Role, string> = {
  visitor: "Visitor",
  customer: "Customer",
  staff: "Door staff",
  organizer: "Organizer",
  admin: "Admin",
};

export type { StaffProfile } from "@/staff/data";

/** Organizer and platform-admin accounts. Their screens are the website's own, shown inside the app. */
export type PortalProfile = { email: string; name: string; firstName: string; initials: string; label: string; roles: Role[] };

const norm = (email?: string | null) => (email ? email.trim().toLowerCase() : "");

/** The signed-in account, if `email` is it. */
function signedIn(email?: string | null) {
  const user = accountSnapshot().user;
  return user && norm(user.email) === norm(email) ? user : null;
}

/** Every role an account holds, in the order the website gives them; the first is where they land after signing in. */
export function rolesFor(email?: string | null): Role[] {
  if (!norm(email)) return ["visitor"];
  const roles = signedIn(email)?.roles ?? [];
  return roles.length ? (roles as Role[]) : ["customer"];
}

/** Organizer or admin details for the portal screens, from the signed-in account. */
export function portalFor(email?: string | null): PortalProfile | undefined {
  const user = signedIn(email);
  if (!user || !user.roles.some((r) => r === "organizer" || r === "admin")) return undefined;
  const parts = user.name.split(/\s+/);
  return {
    email: user.email,
    name: user.name,
    firstName: parts[0] ?? user.name,
    initials: parts
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join(""),
    label: user.roles.includes("admin") ? "Platform admin" : "Organizer",
    roles: user.roles as Role[],
  };
}

export const homeForRole = (role: Role): "/" | "/staff" | "/organizer" | "/admin" => (role === "staff" ? "/staff" : role === "organizer" ? "/organizer" : role === "admin" ? "/admin" : "/");
