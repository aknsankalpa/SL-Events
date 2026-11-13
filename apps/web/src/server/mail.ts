// Sends email through the website's mailbox (on Hostinger: an email account made in hPanel, sent over SMTP).
// Server code only.
//
// Settings (environment variables):
//   SMTP_HOST   smtp.hostinger.com
//   SMTP_PORT   465 (SSL, the default) or 587 (STARTTLS)
//   SMTP_USER   the full mailbox address, e.g. no-reply@example.com
//   SMTP_PASS   that mailbox's password
//   MAIL_FROM   optional, e.g. "SL Events <no-reply@example.com>" (defaults to SMTP_USER)
//
// Without SMTP_HOST nothing is sent: the message is written to the server log instead, which is what development uses.

import nodemailer, { type Transporter } from "nodemailer";

export type Mail = { to: string; subject: string; text: string; html?: string };

let transport: Transporter | null | undefined;

function transporter(): Transporter | null {
  if (transport !== undefined) return transport;
  const host = process.env.SMTP_HOST;
  if (!host) return (transport = null);
  const port = Number(process.env.SMTP_PORT ?? 465);
  transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    // A slow mail server must not hold up the page that sent the message for long.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return transport;
}

export const mailConfigured = () => !!process.env.SMTP_HOST;

/** Sends one message. Returns false (and logs why) when it couldn't be sent; callers decide whether that matters. */
export async function sendMail(mail: Mail): Promise<boolean> {
  const t = transporter();
  if (!t) {
    console.info(`[mail] (not sent, SMTP is not set up) to ${mail.to}: ${mail.subject}\n${mail.text}`);
    return false;
  }
  try {
    await t.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, ...mail });
    return true;
  } catch (e) {
    console.error(`[mail] sending to ${mail.to} failed:`, e instanceof Error ? e.message : e);
    return false;
  }
}
