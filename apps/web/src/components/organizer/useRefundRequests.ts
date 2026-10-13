"use client";

import { useMemo, useSyncExternalStore } from "react";
import { formatKrw } from "@/lib/format";
import { pendingCount, refundStore, type RefundRequest } from "@/lib/refunds";

const stamp = () => `Today, ${new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;

export function useRefundRequests() {
  const requests = useSyncExternalStore(refundStore.subscribe, refundStore.getSnapshot, refundStore.getServerSnapshot);
  const pending = useMemo(() => pendingCount(requests), [requests]);

  const change = (id: string, patch: (r: RefundRequest) => RefundRequest) =>
    refundStore.update((list) => list.map((r) => (r.id === id ? patch(r) : r)));

  return {
    requests,
    pending,
    /** `amount` is what is sent back; 0 for a cancellation of an unpaid booking. */
    approve(id: string, amount: number, note: string, approver: string) {
      // TODO: the API voids the unused tickets, releases held seats and queues the payout.
      change(id, (r) => ({
        ...r,
        status: "approved",
        decision: { at: stamp(), amount, note: note.trim() || undefined },
        timeline: [
          {
            label: amount > 0 ? `Refund of ${formatKrw(amount)} queued for payout by SL Events` : "Booking cancelled and seats released",
            at: stamp(),
          },
          { label: `Approved by ${approver}`, at: stamp() },
          ...r.timeline,
        ],
      }));
    },
    decline(id: string, reason: string, note: string, approver: string) {
      change(id, (r) => ({
        ...r,
        status: "declined",
        decision: { at: stamp(), declineReason: reason, note: note.trim() || undefined },
        timeline: [{ label: `Declined by ${approver}: ${reason.toLowerCase()}`, at: stamp() }, ...r.timeline],
      }));
    },
  };
}
