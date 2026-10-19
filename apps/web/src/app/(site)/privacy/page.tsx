import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/layout/LegalPage";

export const metadata: Metadata = { title: "Privacy policy" };

const sections: LegalSection[] = [
  {
    id: "collect",
    title: "What we collect",
    body: [
      "Account details: your name and email address, and a password (stored securely, never in plain text).",
      "Booking details: the events and tickets you book, the names on tickets, and the payment proofs you upload, which can show your name and part of a bank account.",
      "If you apply to be an organizer: the details on the application form, including any documents you attach.",
      "Messages you send us, and basic technical data such as the pages you visit, your browser and your IP address, to keep the service secure and working.",
    ],
  },
  {
    id: "use",
    title: "How we use it",
    body: [
      "To run your account, issue and check tickets, verify payments, send booking emails and notifications, answer your messages and review organizer applications.",
      "To keep SL Events safe, for example to detect fake payment proofs or copied tickets, and to improve how the service works.",
      "We only send you news about events if you asked for it, and you can stop at any time.",
    ],
  },
  {
    id: "sharing",
    title: "Who sees it",
    body: [
      "Organizers see the names and emails of people booked on their events, so they can run check-in and contact attendees about the event. They do not see your payment proof.",
      "Event staff who scan tickets see a ticket's holder name and whether it is valid.",
      "Our service providers (such as hosting and email delivery) process data for us under our instructions. We do not sell your personal data.",
      "We may share information when the law requires it or to protect people from harm or fraud.",
    ],
  },
  {
    id: "cookies",
    title: "Cookies and local storage",
    body: [
      "We use a small amount of storage in your browser to keep you logged in, remember your preferences and keep the site working. We do not use it to build advertising profiles.",
    ],
  },
  {
    id: "keep",
    title: "How long we keep it",
    body: [
      "We keep your account while it is open. Records of payments and bookings are kept for as long as the law requires for financial records, even after an account is deleted.",
      "Organizer application documents are kept while the application is open and for a limited time after a decision.",
    ],
  },
  {
    id: "rights",
    title: "Your choices",
    body: [
      "You can see and change your details in Profile. You can ask us for a copy of your data, to correct it, or to delete your account, and we will do so unless we must keep something by law.",
      "To ask, use the contact page and tell us the email on your account.",
    ],
  },
  {
    id: "security",
    title: "Keeping it safe",
    body: [
      "We protect your data with access controls and encrypted connections. No service is perfectly secure, so use a strong, unique password and tell us if you think your account has been used by someone else.",
    ],
  },
  {
    id: "children",
    title: "Children",
    body: ["SL Events is for adults and for families booking together. Please do not create an account for a child under 14."],
  },
  {
    id: "updates",
    title: "Changes to this policy",
    body: ["If we change how we handle personal data, we will update this page and, for important changes, tell you directly."],
  },
  {
    id: "contact",
    title: "Contact",
    body: ["Questions about your data? Use the contact page or email support@slevents.kr."],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      updated="October 2026"
      intro="We collect only what we need to run SL Events: to let you book tickets, to verify bank-transfer payments and to help organizers run their events. This page explains what that is and what you can do about it."
      sections={sections}
    />
  );
}
