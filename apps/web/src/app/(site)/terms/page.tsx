import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/layout/LegalPage";

export const metadata: Metadata = { title: "Terms and conditions" };

const sections: LegalSection[] = [
  {
    id: "about",
    title: "About these terms",
    body: [
      "SL Events (“we”, “us”) runs a website and apps where people find events, book tickets and where organizers sell them. By creating an account, booking tickets or applying to become an organizer, you agree to these terms.",
      "Anyone can browse events without an account. An account is needed to book.",
    ],
  },
  {
    id: "accounts",
    title: "Your account",
    body: [
      "Give us a real name and an email address you can read, and keep your password private. You are responsible for what happens under your account.",
      "You must verify your email address with the code we send. Tell us straight away if you think someone else has used your account.",
    ],
  },
  {
    id: "booking",
    title: "Browsing and booking",
    body: [
      "An event page shows the date and time in Korea Standard Time (KST), the venue, the ticket types, their prices and how many are left. Availability changes quickly and is only guaranteed once your booking is confirmed.",
      "When you book, we hold your tickets for 24 hours so you can pay. If we have not received a matching payment proof by then, the tickets go back on sale.",
      "Each organizer sets the rules for their event, such as age limits or what you may bring. Read the event page before you book.",
    ],
  },
  {
    id: "payments",
    title: "Payments by bank transfer",
    body: [
      "Tickets are paid for by bank transfer to the account shown on the payment screen and on the payment instructions page. Use the exact total and your booking number as the reference.",
      "After the transfer, upload a clear screenshot as proof. A member of our team checks each payment, usually within 2–6 hours, and then issues your QR tickets. Tickets are only issued for payments we have verified.",
      "If the amount or details do not match, we will tell you what is missing. Your seats stay held while we sort it out, within the 24-hour hold.",
    ],
  },
  {
    id: "tickets",
    title: "Tickets and entry",
    body: [
      "Each ticket has its own QR code and is valid once. The name on a ticket may be compared with ID at the door. To change a name, contact us at least 24 hours before the event.",
      "Do not copy, sell or share your QR codes publicly. We may cancel tickets that have been copied or resold, and the organizer may refuse entry.",
    ],
  },
  {
    id: "changes",
    title: "Changes to events",
    body: [
      "Organizers can change or cancel their events. If an event is changed, moved or cancelled, we tell you by email and in your notifications as soon as we know, and your booking stays visible in your account.",
      "We are not responsible for costs you pay for travel or accommodation around an event.",
    ],
  },
  {
    id: "organizers",
    title: "Organizers",
    body: [
      "To sell tickets you must apply and be approved. We may ask for more information and we decide each application at our discretion. You can follow your application with its reference number and email.",
      "Organizers must describe their events honestly, run them as advertised, keep ticket numbers accurate and follow the law that applies to their event. We may pause an event, or an organizer, if there is a risk to buyers.",
      "We pay out ticket revenue to the bank account in the organizer's profile after the event, once payments have been verified.",
    ],
  },
  {
    id: "use",
    title: "Acceptable use",
    body: [
      "Do not use SL Events to commit fraud, send false payment proofs, interfere with the service, collect other people's data or break the law. We may suspend accounts that do.",
    ],
  },
  {
    id: "liability",
    title: "Our responsibility",
    body: [
      "Events are run by organizers, not by SL Events. We take care with the service, but we cannot promise it will always be available or error-free, and we are not liable for losses that were not reasonably foreseeable, to the extent the law allows.",
    ],
  },
  {
    id: "updates",
    title: "Changes to these terms",
    body: [
      "We may update these terms. When we make an important change we will tell you by email or on the site. Using SL Events after a change means you accept it.",
    ],
  },
  {
    id: "contact",
    title: "Contact",
    body: ["Questions about these terms? Use the contact page or email support@slevents.kr."],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms and conditions"
      updated="October 2026"
      intro="These terms explain how SL Events works for visitors, customers and organizers: how booking and bank-transfer payment work, what you can expect from us, and what we expect from you."
      sections={sections}
    />
  );
}
