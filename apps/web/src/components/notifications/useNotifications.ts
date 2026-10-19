"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useCustomerSettings } from "@/components/account/useCustomerSettings";
import { useBookings } from "@/components/booking/useBookings";
import { bookingNotifications, readStore, staticNotifications, type Notification } from "@/lib/notifications";

export type NotificationView = Notification & { unread: boolean };

/** The customer's notifications (booking updates, event news, announcements) with read state, newest needs first. */
export function useNotifications() {
  const { bookings, ready } = useBookings();
  const { settings } = useCustomerSettings();
  const read = useSyncExternalStore(readStore.subscribe, readStore.getSnapshot, readStore.getServerSnapshot);

  const items = useMemo<NotificationView[]>(() => {
    const n = settings.notifications;
    const all = [
      ...bookingNotifications(bookings),
      ...staticNotifications.filter((x) => (x.kind === "announcement" ? n.announcements : n.city)),
    ];
    const seen = new Set(read);
    return all
      .map((x) => ({ ...x, unread: !seen.has(x.id) }))
      .sort((a, b) => Number(!!b.attention) - Number(!!a.attention));
  }, [bookings, settings.notifications, read]);

  const unread = items.filter((i) => i.unread).length;
  const markRead = (id: string) => {
    if (!readStore.getSnapshot().includes(id)) readStore.update((list) => [...list, id]);
  };
  const markAllRead = () => readStore.update((list) => [...new Set([...list, ...items.map((i) => i.id)])]);

  return { items, unread, ready, markRead, markAllRead };
}
