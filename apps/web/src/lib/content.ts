// Notifications and help-centre copy. Mock data until the backend exists.
// FAQ answers other than the first are placeholders; the designs only show the questions.

export type NotificationItem = {
  id: string;
  group: "Today" | "This week";
  kind: "booking" | "event";
  tone: "success" | "danger" | "warning" | "neutral";
  icon: "check" | "alert" | "hourglass" | "clock" | "calendar" | "sparkles" | "receipt";
  title: string;
  body: string;
  time: string;
  unread?: boolean;
  action?: { label: string; href: string };
};

export const notifications: NotificationItem[] = [
  {
    id: "n1",
    group: "Today",
    kind: "booking",
    tone: "success",
    icon: "check",
    title: "Your tickets are ready",
    body: "Payment for Sri Lankan Music Night (SL-41730) is confirmed. Your 2 QR tickets are in My tickets.",
    time: "2:41 PM",
    unread: true,
    action: { label: "View QR tickets", href: "/my-tickets/SL-41730" },
  },
  {
    id: "n2",
    group: "Today",
    kind: "booking",
    tone: "danger",
    icon: "alert",
    title: "Payment proof rejected",
    body: "Baila Night (SL-41698): the amount didn't match. We received ₩20,000 but ₩25,000 is due.",
    time: "11:52 AM",
    unread: true,
    action: { label: "Upload new proof", href: "/bookings/SL-41698/proof" },
  },
  {
    id: "n3",
    group: "Today",
    kind: "booking",
    tone: "warning",
    icon: "hourglass",
    title: "We received your payment proof",
    body: "Sri Lanka Cricket Cup (SL-41744) is being checked. This usually takes 2–6 hours.",
    time: "11:05 AM",
    unread: true,
  },
  {
    id: "n4",
    group: "This week",
    kind: "booking",
    tone: "warning",
    icon: "clock",
    title: "Pay by tomorrow to keep your seats",
    body: "Kottu & Hoppers Food Fair (SL-41752): transfer ₩10,000 and upload proof by Sat, 10 Oct, 1:10 PM.",
    time: "Thu",
    action: { label: "Payment details", href: "/bookings/SL-41752/payment" },
  },
  {
    id: "n5",
    group: "This week",
    kind: "event",
    tone: "neutral",
    icon: "calendar",
    title: "Time change: Sinhala Movie Screening",
    body: "The screening on 21 Nov now starts at 7:30 PM instead of 7:00 PM.",
    time: "Wed",
  },
  {
    id: "n6",
    group: "This week",
    kind: "event",
    tone: "neutral",
    icon: "sparkles",
    title: "New event in Seoul",
    body: "Deepavali Lights Night is on sale. Lamp lighting, Tamil music and a vegetarian dinner.",
    time: "Tue",
    action: { label: "View event", href: "/events" },
  },
];

export type NotificationSetting = { id: string; label: string; hint: string; on: boolean; locked?: boolean };

export const channelSettings: NotificationSetting[] = [
  { id: "email", label: "Email", hint: "kasun@example.com", on: true },
  { id: "browser", label: "Browser notifications", hint: "On this device", on: true },
  { id: "kakao", label: "KakaoTalk", hint: "Messages from SL Events channel", on: false },
];

export const topicSettings: NotificationSetting[] = [
  { id: "bookings", label: "Booking and payment updates", hint: "Always on for active bookings", on: true, locked: true },
  { id: "reminders", label: "Event reminders", hint: "The day before and 3 hours before", on: true },
  { id: "city", label: "New events in my city", hint: "Seoul", on: true },
  { id: "offers", label: "Offers and promotions", hint: "", on: false },
];

export const helpCategories = [
  { id: "booking", title: "Booking & payment", articles: 8, icon: "bank" },
  { id: "tickets", title: "Tickets & QR codes", articles: 6, icon: "qr" },
  { id: "account", title: "Account & login", articles: 4, icon: "user" },
] as const;

export const faqs = [
  {
    q: "How long does it take to check my payment?",
    a: "We check transfers every day from 9 AM to 10 PM Korea time, usually within 2–6 hours. Proofs sent late at night are checked the next morning. You get an email and a notification when your QR tickets are ready.",
  },
  {
    q: "I sent the wrong amount. What should I do?",
    a: "Send the difference to the same account with the same memo, then upload both screenshots. If you sent too much, contact us with your booking number and we will help you.",
  },
  {
    q: "Can I pay from a friend's bank account?",
    a: "Yes. Enter the sender's name exactly as it appears on the transfer, and add a note for our team so we can match the payment to your booking.",
  },
  {
    q: "My proof was rejected. Do I lose my seats?",
    a: "No. Your seats stay held while we sort it out. We will tell you why the proof did not match, and you can upload a new screenshot from your booking.",
  },
  {
    q: "Can I give my ticket to someone else?",
    a: "Each QR ticket has a name on it and staff may compare it with ID at the door. To change the name, contact us at least 24 hours before the event.",
  },
];

export const faqTotal = 23;

export const contactChannels = [
  { id: "kakao", label: "KakaoTalk", value: "@slevents · fastest reply", icon: "message" },
  { id: "email", label: "Email", value: "support@slevents.kr", icon: "mail" },
  { id: "phone", label: "Phone", value: "+82 10-0000-0000", icon: "phone" },
  { id: "hours", label: "Hours", value: "Every day, 9 AM – 10 PM KST", icon: "clock" },
] as const;
