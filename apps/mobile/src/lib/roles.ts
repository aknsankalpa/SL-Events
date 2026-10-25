/**
 * Who a signed-in account is, in the one app that serves everyone. The website has no real roles yet either, so for
 * now an account's roles come from this demo list. Anyone not listed is a customer; nobody signed in is a visitor.
 * When the Supabase backend exists this becomes a `role` on the account, checked on the server for every action.
 */
export type Role = "visitor" | "customer" | "staff" | "organizer" | "admin";

export const roleLabels: Record<Role, string> = {
  visitor: "Visitor",
  customer: "Customer",
  staff: "Door staff",
  organizer: "Organizer",
  admin: "Admin",
};

export type StaffProfile = {
  email: string;
  name: string;
  firstName: string;
  initials: string;
  /** The organizer that invited them. Door staff only see that organizer's events. */
  organizer: string;
  roleLabel: string;
  /** Who to call from the offline and refusal screens. */
  organizerContact: { name: string; phone: string };
  /** Events they were assigned to (ids from the staff event list). */
  events: string[];
};

export const staffAccounts: Record<string, StaffProfile> = {
  "ishara@slevents.kr": {
    email: "ishara@slevents.kr",
    name: "Ishara Kumara",
    firstName: "Ishara",
    initials: "IK",
    organizer: "Lanka Beats Korea",
    roleLabel: "Door staff",
    organizerContact: { name: "Nimal Fernando", phone: "010-3456-7890" },
    events: ["music-night", "baila-night", "cultural-festival", "deepavali-lights-night"],
  },
};

/** Organizer and platform-admin accounts. Their screens are the website's own, shown inside the app. */
export type PortalProfile = { email: string; name: string; firstName: string; initials: string; label: string; roles: Role[] };

export const portalAccounts: Record<string, PortalProfile> = {
  "nimal@example.com": { email: "nimal@example.com", name: "Nimal Fernando", firstName: "Nimal", initials: "NF", label: "Organizer · Lanka Beats Korea", roles: ["organizer", "customer"] },
  "sanduni@slevents.kr": { email: "sanduni@slevents.kr", name: "Sanduni Perera", firstName: "Sanduni", initials: "SP", label: "Platform admin · Owner", roles: ["admin", "customer"] },
};

const norm = (email?: string | null) => (email ? email.trim().toLowerCase() : "");

export const staffFor = (email?: string | null): StaffProfile | undefined => staffAccounts[norm(email)];
export const portalFor = (email?: string | null): PortalProfile | undefined => portalAccounts[norm(email)];

/** Every role an account holds. The first one is where they land after signing in. */
export function rolesFor(email?: string | null): Role[] {
  if (!norm(email)) return ["visitor"];
  if (staffFor(email)) return ["staff"];
  return portalFor(email)?.roles ?? ["customer"];
}

export const homeForRole = (role: Role): "/" | "/staff" | "/organizer" | "/admin" => (role === "staff" ? "/staff" : role === "organizer" ? "/organizer" : role === "admin" ? "/admin" : "/");
