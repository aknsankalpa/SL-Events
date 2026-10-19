// Help-centre copy. Mock data until the backend exists.
// FAQ answers other than the first are placeholders; the designs only show the questions.

export const helpCategories = [
  { id: "booking", title: "Booking & payment", articles: 7, icon: "bank" },
  { id: "tickets", title: "Tickets & QR codes", articles: 4, icon: "qr" },
  { id: "account", title: "Account & login", articles: 4, icon: "user" },
  { id: "organizers", title: "For organizers", articles: 4, icon: "store" },
] as const;

export type FaqCategory = (typeof helpCategories)[number]["id"];

export const faqs: { cat: FaqCategory; q: string; a: string }[] = [
  {
    cat: "booking",
    q: "How do I book tickets?",
    a: "Open an event, choose your tickets and review the order. Then pay by bank transfer to the account shown, and upload a screenshot of the transfer. Your QR tickets appear in My tickets once we have checked the payment.",
  },
  {
    cat: "booking",
    q: "How long does it take to check my payment?",
    a: "We check transfers every day from 9 AM to 10 PM Korea time (KST), usually within 2–6 hours. Proofs sent late at night are checked the next morning. You get an email and a notification when your QR tickets are ready.",
  },
  {
    cat: "booking",
    q: "How long are my seats held?",
    a: "Your tickets are held for 24 hours after you book. Send the transfer and upload your proof within that time, or the tickets go back on sale.",
  },
  {
    cat: "booking",
    q: "I sent the wrong amount. What should I do?",
    a: "Send the difference to the same account with the same reference, then upload both screenshots. If you sent too much, contact us with your booking number and we will help you.",
  },
  {
    cat: "booking",
    q: "Can I pay from a friend's bank account?",
    a: "Yes. Enter the sender's name exactly as it appears on the transfer, and add a note for our team so we can match the payment to your booking.",
  },
  {
    cat: "booking",
    q: "My proof was rejected. Do I lose my seats?",
    a: "No. Your seats stay held while we sort it out. We will tell you why the proof did not match, and you can upload a new screenshot from your booking.",
  },
  {
    cat: "tickets",
    q: "Where do I find my QR ticket?",
    a: "Log in and open My tickets. Each ticket has its own QR code. Show it on your phone at the entrance.",
  },
  {
    cat: "tickets",
    q: "What if my phone has no signal or the battery is low?",
    a: "Take a screenshot of your QR code before you leave. If you can't show it, staff can find your booking with your name and booking number.",
  },
  {
    cat: "tickets",
    q: "Can I give my ticket to someone else?",
    a: "Each QR ticket has a name on it and staff may compare it with ID at the door. To change the name, contact us at least 24 hours before the event.",
  },
  {
    cat: "tickets",
    q: "Do children need a ticket?",
    a: "Each organizer sets the rules for their event. Check the description on the event page, or contact the organizer from there.",
  },
  {
    cat: "account",
    q: "Do I need an account to look at events?",
    a: "No. Anyone can browse events and see prices and availability. You need a free account to book tickets.",
  },
  {
    cat: "account",
    q: "I didn't get the verification email.",
    a: "Check your spam folder first, then ask for a new code from the verification page. The code is valid for 30 minutes. If it still doesn't arrive, contact us and we will help.",
  },
  {
    cat: "account",
    q: "I forgot my password.",
    a: "Choose “Forgot password?” on the log-in page and enter your email. We send a link to set a new password. The link works for 30 minutes.",
  },
  {
    cat: "account",
    q: "How do I change my name or email?",
    a: "Open Profile after you log in and edit your details. Changing your email asks you to verify the new address.",
  },
  {
    cat: "organizers",
    q: "How do I become an organizer?",
    a: "Use “Become an organizer” in the menu and fill in the short application. You need a name, an email, the name of your group and a few lines about your events. Documents are optional.",
  },
  {
    cat: "organizers",
    q: "How long does the review take?",
    a: "A member of our team starts within 2 working days. You can follow progress on the application status page with your reference and email, and we email you the decision.",
  },
  {
    cat: "organizers",
    q: "Do I need to send documents?",
    a: "Not to apply. A poster from a past event or a link to your page helps, and we will ask if we need anything more.",
  },
  {
    cat: "organizers",
    q: "How do organizers get paid?",
    a: "Buyers pay SL Events by bank transfer and we confirm each payment. After your event we pay out your ticket revenue to the bank account in your organizer profile.",
  },
];

export const faqTotal = faqs.length;

export const contactChannels = [
  { id: "email", label: "Email", value: "support@slevents.kr", icon: "mail" },
  { id: "kakao", label: "KakaoTalk", value: "@slevents · fastest reply", icon: "message" },
  { id: "phone", label: "Phone", value: "+82 10-0000-0000", icon: "phone" },
  { id: "hours", label: "Hours", value: "Every day, 9 AM – 10 PM KST", icon: "clock" },
] as const;
