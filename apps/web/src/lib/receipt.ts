import { canIssueTickets, formatKst, type Booking } from "./bookings";
import { formatKrw } from "./format";

/** A receipt exists once the booking is paid and verified, or when nothing was owed. */
export const receiptAvailable = (b: Booking) => canIssueTickets(b);

export const receiptNumber = (b: Booking) => `RCP-${b.id.replace(/^SL-/, "")}`;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** A standalone, printable receipt page. Saved as a file, or opened and printed to PDF. */
export function receiptHtml(b: Booking, opts: { eventTitle: string; customer: string; email: string }): string {
  const issued = formatKst(b.verifiedAt ?? b.createdIso ?? new Date().toISOString());
  const rows = b.lines
    .map(
      (l) =>
        `<tr><td>${esc(l.ticketName)}</td><td class="n">${l.qty}</td><td class="n">${esc(formatKrw(l.unitPrice))}</td><td class="n">${esc(formatKrw(l.qty * l.unitPrice))}</td></tr>`,
    )
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Receipt ${esc(receiptNumber(b))}</title>
<style>
body{font:14px/1.5 system-ui,sans-serif;color:#1a1a1a;max-width:640px;margin:40px auto;padding:0 20px}
h1{font-size:22px;margin:0}.muted{color:#666}.row{display:flex;justify-content:space-between;gap:16px;margin:4px 0}
table{width:100%;border-collapse:collapse;margin:20px 0}th,td{padding:8px 4px;border-bottom:1px solid #ddd;text-align:left}.n{text-align:right}
.total{font-size:18px;font-weight:700}hr{border:0;border-top:1px solid #ddd;margin:20px 0}
</style></head><body>
<h1>SL Events</h1><p class="muted">Booking confirmation and receipt</p><hr>
<div class="row"><span class="muted">Receipt</span><strong>${esc(receiptNumber(b))}</strong></div>
<div class="row"><span class="muted">Booking</span><strong>${esc(b.id)}</strong></div>
<div class="row"><span class="muted">Date</span><span>${esc(issued)} (Korea time)</span></div>
<div class="row"><span class="muted">Customer</span><span>${esc(opts.customer)} · ${esc(opts.email)}</span></div>
<hr><strong>${esc(opts.eventTitle)}</strong><div class="muted">${esc(b.eventDate)}</div>
<table><thead><tr><th>Ticket</th><th class="n">Qty</th><th class="n">Price</th><th class="n">Amount</th></tr></thead><tbody>${rows}</tbody></table>
${b.fee ? `<div class="row"><span class="muted">Booking fee</span><span>${esc(formatKrw(b.fee))}</span></div>` : ""}
<div class="row total"><span>Total paid</span><span>${esc(formatKrw(b.total))}</span></div>
<hr>
<div class="row"><span class="muted">Payment method</span><span>${esc(b.paymentMethod)}</span></div>
<div class="row"><span class="muted">Payment reference</span><span>${esc(b.id)}</span></div>
<div class="row"><span class="muted">Attendees</span><span>${esc(b.attendees.join(", "))}</span></div>
<p class="muted" style="margin-top:32px">Thank you for booking with SL Events. Show your QR tickets at the entrance.</p>
</body></html>`;
}

export function downloadReceipt(b: Booking, opts: { eventTitle: string; customer: string; email: string }) {
  const url = URL.createObjectURL(new Blob([receiptHtml(b, opts)], { type: "text/html;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${receiptNumber(b)}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
