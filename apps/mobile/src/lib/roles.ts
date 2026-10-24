/**
 * Who a signed-in account is, in the one app that serves everyone. The website has no real roles yet either, so for
 * now an account's role comes from this demo list. Anyone not listed is a customer; nobody signed in is a visitor.
 * When the Supabase backend exists this becomes a `role` on the account, checked on the server for every action.
 */
export type Role = "visitor" | "customer" | "staff";

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

export const staffFor = (email?: string | null): StaffProfile | undefined => (email ? staffAccounts[email.trim().toLowerCase()] : undefined);

/** Where an account lands after signing in. */
export const homeFor = (email?: string | null): "/" | "/staff" => (staffFor(email) ? "/staff" : "/");
