"use client";

import { useSyncExternalStore } from "react";
import { MessageSquareText } from "lucide-react";
import { useSession } from "@/components/auth/useSession";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/StatusBadge";
import { formatKst } from "@/lib/bookings";
import { supportStore } from "@/lib/supportRequests";

/** The signed-in customer's own support requests, with our replies. Visitors don't see this. */
export function SupportRequests() {
  const { user } = useSession();
  const all = useSyncExternalStore(supportStore.subscribe, supportStore.getSnapshot, supportStore.getServerSnapshot);
  if (!user) return null;
  const mine = all.filter((r) => r.email === user.email);

  return (
    <Card className="p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text">
        <MessageSquareText size={16} aria-hidden className="text-amber" /> Your support requests
      </h2>
      {mine.length === 0 ? (
        <p className="mt-3 text-[13px] text-muted">You haven&apos;t sent us any messages yet. Anything you send will be listed here with our reply.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {mine.map((r) => (
            <li key={r.id} className="rounded-xl border border-line bg-surface-2 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] text-dim">
                  <span className="font-mono">{r.id}</span> · {r.topic}
                  {r.booking ? ` · ${r.booking}` : ""} · {formatKst(r.createdAt)}
                </p>
                <Badge tone={r.status === "answered" ? "success" : "warning"} dot>
                  {r.status === "answered" ? "Answered" : "Open"}
                </Badge>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-text">{r.message}</p>
              {r.reply && (
                <div className="mt-3 rounded-lg border-l-2 border-amber bg-surface px-3 py-2">
                  <p className="text-[11px] font-bold text-amber">SL Events · {formatKst(r.reply.at)}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">{r.reply.text}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
