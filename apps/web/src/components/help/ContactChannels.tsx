import { Clock, Mail, MessageCircle, Phone, type LucideIcon } from "lucide-react";
import { contactChannels } from "@/lib/content";

const icons: Record<(typeof contactChannels)[number]["icon"], LucideIcon> = {
  message: MessageCircle,
  mail: Mail,
  phone: Phone,
  clock: Clock,
};

/** The ways to reach SL Events, with email first. */
export function ContactChannels() {
  return (
    <ul className="space-y-4">
      {contactChannels.map((c) => {
        const Icon = icons[c.icon];
        return (
          <li key={c.id} className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold">
              <Icon size={16} aria-hidden />
            </span>
            <span className="leading-tight">
              <span className="block text-[13px] font-bold text-text">{c.label}</span>
              <span className="mt-0.5 block text-[11px] text-dim">{c.value}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
