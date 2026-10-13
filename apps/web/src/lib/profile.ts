import { createPersistedStore } from "./persistedStore";

export type OrganizerNotificationKey =
  | "newBooking"
  | "paymentProof"
  | "refundRequest"
  | "lowStock"
  | "dailySummary"
  | "platformNews";

export type OrganizerProfile = {
  fullName: string;
  roleTitle: string;
  email: string;
  phone: string;
  language: string;
  orgName: string;
  orgBio: string;
  orgEmail: string;
  orgPhone: string;
  orgLink: string;
  city: string;
  /** Downscaled data URL of the organization's logo; empty means "use initials". */
  logoUrl: string;
  payout: { bank: string; number: string; holder: string };
  notifications: Record<OrganizerNotificationKey, boolean>;
  verified: boolean;
  memberSince: string;
};

export const seedProfile: OrganizerProfile = {
  fullName: "Nimal Fernando",
  roleTitle: "Founder",
  email: "nimal@lankabeats.kr",
  phone: "010-5588-2210",
  language: "English",
  orgName: "Lanka Beats Korea",
  orgBio: "We bring Sri Lankan bands, DJs and dancers to stages across Korea, from live music nights to family festivals.",
  orgEmail: "hello@lankabeats.kr",
  orgPhone: "010-5588-2210",
  orgLink: "instagram.com/lankabeatskorea",
  city: "Seoul",
  logoUrl: "",
  payout: { bank: "KB Kookmin Bank", number: "123401-04-889120", holder: "LANKA BEATS KOREA" },
  notifications: {
    newBooking: true,
    paymentProof: true,
    refundRequest: true,
    lowStock: true,
    dailySummary: false,
    platformNews: false,
  },
  verified: true,
  memberSince: "August 2025",
};

export const profileStore = createPersistedStore<OrganizerProfile>("sl-events:organizer-profile:v1", seedProfile);

/** "123401-04-889120" → "••••••••• 9120" for display; the full number is only shown while editing. */
export function maskAccount(num: string): string {
  const digits = num.replace(/\D/g, "");
  return digits.length > 4 ? `•••• •••• ${digits.slice(-4)}` : num;
}

export const profileInitials = (p: Pick<OrganizerProfile, "fullName">) =>
  p.fullName
    .split(/\s+/)
    .map((x) => x[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
