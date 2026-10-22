"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ExternalLink, Mail, RotateCcw, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Toggle } from "@/components/ui/Toggle";
import { ADMIN, defaultTemplates, notificationTexts, sampleValues, templateTags, websitePages } from "@/lib/admin";
import { logAudit, updateConfig, type AdminConfig } from "@/lib/adminStore";
import { faqs } from "@/lib/content";
import { AdminHeader, Panel, Tabs, Toast } from "./ui";
import { useAdminConfig } from "./useAdmin";

type Tab = "banners" | "emails" | "notifications" | "faq" | "pages";
type Lang = "en" | "si" | "ta";
type Draft = Partial<Pick<AdminConfig, "banner" | "templates" | "notifications" | "faq">>;

const langs: { id: Lang; label: string }[] = [
  { id: "en", label: "English" },
  { id: "si", label: "සිංහල" },
  { id: "ta", label: "தமிழ்" },
];

const fill = (text: string) => text.replace(/\{\{(\w+)\}\}/g, (_, k: string) => sampleValues[k] ?? "");

const inputClass = "w-full rounded-lg border border-line bg-surface px-4 py-3 text-sm text-text placeholder:text-dim focus:border-gold focus:outline-none";

/**
 * Banners, email wording, notification text and FAQ. Changes stay a draft until "Publish changes", so a half-finished
 * edit never reaches customers. Template text is saved per language; a missing translation falls back to English.
 */
export function ContentPage() {
  const config = useAdminConfig();
  const [tab, setTab] = useState<Tab>("banners");
  const [draft, setDraft] = useState<Draft>({});
  const [templateId, setTemplateId] = useState(defaultTemplates[0]!.id);
  const [lang, setLang] = useState<Lang>("en");
  const [faqIndex, setFaqIndex] = useState(0);
  const [toast, setToast] = useState<string>();
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const banner = draft.banner ?? config.banner;
  const templates = draft.templates ?? config.templates;
  const notifications = draft.notifications ?? config.notifications;
  const faq = draft.faq ?? config.faq;

  const say = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(undefined), 3200);
  };

  const changed = (Object.keys(draft) as (keyof Draft)[]).filter((k) => JSON.stringify(draft[k]) !== JSON.stringify(config[k]));
  const dirty = changed.length > 0;

  /* ----- email templates ----- */
  const base = defaultTemplates.find((t) => t.id === templateId)!;
  const key = lang === "en" ? templateId : `${templateId}.${lang}`;
  const stored = templates[key];
  const english = { subject: templates[templateId]?.subject ?? base.subject, body: templates[templateId]?.body ?? base.body };
  const current = stored ?? (lang === "en" ? english : { subject: "", body: "" });
  const shown = lang === "en" || stored?.body ? current : english;

  function setTemplate(next: { subject: string; body: string }) {
    setDraft((d) => ({ ...d, templates: { ...(d.templates ?? config.templates), [key]: next } }));
  }
  function insertTag(tag: string) {
    const el = bodyRef.current;
    const at = el?.selectionStart ?? current.body.length;
    const end = el?.selectionEnd ?? at;
    setTemplate({ ...current, body: current.body.slice(0, at) + tag + current.body.slice(end) });
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(at + tag.length, at + tag.length);
    });
  }
  function resetTemplate() {
    const rest = { ...templates };
    delete rest[key];
    setDraft((d) => ({ ...d, templates: rest }));
  }

  /* ----- notification and FAQ ----- */
  const faqItem = (i: number) => faq[String(i)] ?? { q: faqs[i]!.q, a: faqs[i]!.a };

  function publish() {
    // TODO: the API validates, versions and publishes content; here the saved values replace the defaults at once.
    updateConfig((c) => ({ ...c, ...draft, bannerPublished: c.bannerPublished || !!draft.banner }));
    const labels: Record<keyof Draft, string> = { banner: "Announcement banner", templates: "Email templates", notifications: "Notification text", faq: "FAQ" };
    for (const k of changed) logAudit({ type: "content", action: `Published ${labels[k].toLowerCase()}`, item: `content: ${k}`, detail: { changes: [{ label: labels[k], from: "Previous version", to: "New version" }] } });
    setDraft({});
    say("Published. Customers see the changes now.");
  }

  const dates = (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Show from" type="date" value={banner.from} onChange={(e) => setDraft((d) => ({ ...d, banner: { ...banner, from: e.target.value } }))} />
      <Field label="Show until" type="date" value={banner.to} onChange={(e) => setDraft((d) => ({ ...d, banner: { ...banner, to: e.target.value } }))} />
    </div>
  );

  return (
    <>
      <AdminHeader
        section="Content & notices"
        title="Notifications and content"
        actions={
          <>
            {dirty && (
              <button type="button" onClick={() => setDraft({})} className="text-[13px] text-muted hover:text-text">
                Discard
              </button>
            )}
            <Button onClick={publish} disabled={!dirty}>
              Publish changes{dirty ? ` (${changed.length})` : ""}
            </Button>
          </>
        }
      />

      <Tabs
        label="Content"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "banners", label: "Banners" },
          { id: "emails", label: "Email templates", count: defaultTemplates.length },
          { id: "notifications", label: "Notification text" },
          { id: "faq", label: "FAQ" },
          { id: "pages", label: "Website pages" },
        ]}
      />

      {/* ------------------------------- banner ------------------------------- */}
      {tab === "banners" && (
        <div className="mt-6 grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Panel className="p-5 sm:p-6" aria-label="Announcement banner">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-text">Announcement banner</h2>
                <p className="mt-1 text-xs text-dim">A thin bar shown at the top of every public page.</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted">
                {banner.live ? "Live" : "Off"}
                <Toggle label="Banner is live" checked={banner.live} onChange={(live) => setDraft((d) => ({ ...d, banner: { ...banner, live } }))} />
              </div>
            </div>
            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="banner-message" className="mb-2 block text-xs font-bold text-muted">
                  Message
                </label>
                <textarea
                  id="banner-message"
                  rows={3}
                  maxLength={140}
                  value={banner.message}
                  onChange={(e) => setDraft((d) => ({ ...d, banner: { ...banner, message: e.target.value } }))}
                  className={inputClass}
                />
                <p className="mt-1.5 text-right text-[11px] text-dim">{banner.message.length}/140</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Button text" value={banner.button} onChange={(e) => setDraft((d) => ({ ...d, banner: { ...banner, button: e.target.value } }))} />
                <Field label="Button link" value={banner.link} onChange={(e) => setDraft((d) => ({ ...d, banner: { ...banner, link: e.target.value } }))} />
              </div>
              {dates}
            </div>
          </Panel>

          <Panel className="p-5 sm:p-6" aria-label="Banner preview">
            <h2 className="text-base font-bold text-text">Preview</h2>
            <p className="mt-1 text-xs text-dim">{banner.live ? `Shows ${banner.from} to ${banner.to}.` : "The banner is off, so nobody sees it."}</p>
            <div className={`mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-lg bg-danger px-4 py-3 text-center text-[13px] text-white ${banner.live ? "" : "opacity-40"}`}>
              <span>{banner.message || "Your message appears here."}</span>
              {banner.button && <span className="rounded-md bg-white/20 px-3 py-1 text-xs font-bold">{banner.button}</span>}
            </div>
          </Panel>
        </div>
      )}

      {/* ------------------------------- emails ------------------------------- */}
      {tab === "emails" && (
        <div className="mt-6 grid grid-cols-1 items-start gap-5 xl:grid-cols-[17rem_minmax(0,1fr)_minmax(0,0.9fr)]">
          <Panel className="p-2" aria-label="Email templates">
            <ul className="flex gap-1 overflow-x-auto xl:flex-col">
              {defaultTemplates.map((t) => {
                const active = t.id === templateId;
                const edited = Object.keys(templates).some((k) => k === t.id || k.startsWith(`${t.id}.`));
                return (
                  <li key={t.id} className="shrink-0 xl:shrink">
                    <button
                      type="button"
                      onClick={() => setTemplateId(t.id)}
                      aria-current={active ? "true" : undefined}
                      className={`w-full rounded-xl px-4 py-3 text-left transition-colors focus-visible:focus-ring ${active ? "bg-gold/10 ring-1 ring-gold/50" : "hover:bg-surface-2"}`}
                    >
                      <span className="block whitespace-nowrap text-[13px] font-bold text-text xl:whitespace-normal">
                        {t.name}
                        {edited && <span className="ml-2 text-[10px] font-bold uppercase text-gold">Edited</span>}
                      </span>
                      <span className="mt-1 block whitespace-nowrap text-[11px] text-dim xl:whitespace-normal">{t.when}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel className="p-5 sm:p-6" aria-label="Edit template">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-bold text-text">{base.name}</h2>
              <div role="group" aria-label="Language" className="flex gap-1.5">
                {langs.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    aria-pressed={lang === l.id}
                    onClick={() => setLang(l.id)}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors focus-visible:focus-ring ${lang === l.id ? "border-gold bg-gold/15 text-gold" : "border-line text-muted hover:text-text"}`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            {lang !== "en" && !stored?.body && <p className="mt-3 rounded-lg border border-line bg-surface-2 p-3 text-xs text-muted">No {lang === "si" ? "Sinhala" : "Tamil"} version yet. Until you write one, customers who chose this language get the English email.</p>}

            <div className="mt-5 space-y-4">
              <Field label="Subject" value={current.subject} placeholder={lang === "en" ? undefined : english.subject} onChange={(e) => setTemplate({ ...current, subject: e.target.value })} />
              <div>
                <label htmlFor="template-body" className="mb-2 block text-xs font-bold text-muted">
                  Message
                </label>
                <textarea id="template-body" ref={bodyRef} rows={7} value={current.body} placeholder={lang === "en" ? undefined : english.body} onChange={(e) => setTemplate({ ...current, body: e.target.value })} className={inputClass} />
              </div>
              <div>
                <p className="mb-2 text-xs font-bold text-muted">Insert a detail</p>
                <div className="flex flex-wrap gap-2">
                  {templateTags.map((tag) => (
                    <button key={tag} type="button" onClick={() => insertTag(tag)} className="rounded-full border border-line bg-surface-2 px-3 py-1.5 font-mono text-[11px] text-muted transition-colors hover:border-gold hover:text-gold focus-visible:focus-ring">
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="sm" variant="outline" onClick={() => say(`Test email sent to ${ADMIN.email}.`)}>
                <Send size={14} aria-hidden /> Send test to me
              </Button>
              <Button size="sm" variant="ghost" onClick={resetTemplate} disabled={!stored}>
                <RotateCcw size={14} aria-hidden /> Reset to default
              </Button>
            </div>
          </Panel>

          <Panel className="p-5 sm:p-6" aria-label="Preview">
            <h2 className="text-base font-bold text-text">Preview</h2>
            <p className="mt-1 text-xs text-dim">With example details filled in.</p>
            <div className="mt-4 overflow-hidden rounded-xl border border-line bg-surface-2">
              <div className="flex items-center gap-2 border-b border-line px-4 py-3 text-[11px] text-dim">
                <Mail size={13} aria-hidden /> From SL Events · to {sampleValues.first_name!.toLowerCase()}@example.com
              </div>
              <div className="p-4">
                <p className="text-sm font-bold text-text">{fill(shown.subject)}</p>
                <p className="mt-3 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-muted">{fill(shown.body)}</p>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* ---------------------------- notification text ---------------------------- */}
      {tab === "notifications" && (
        <Panel className="mt-6 divide-y divide-line" aria-label="Notification text">
          {notificationTexts.map((n) => {
            const value = notifications[n.id] ?? n.text;
            return (
              <div key={n.id} className="grid grid-cols-1 gap-4 p-5 sm:p-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
                <div>
                  <h2 className="text-sm font-bold text-text">{n.name}</h2>
                  <p className="mt-1 text-[11px] text-dim">Shown in the bell menu and on the notifications page.</p>
                </div>
                <div>
                  <label htmlFor={n.id} className="sr-only">
                    {n.name}
                  </label>
                  <textarea id={n.id} rows={2} value={value} onChange={(e) => setDraft((d) => ({ ...d, notifications: { ...(d.notifications ?? config.notifications), [n.id]: e.target.value } }))} className={inputClass} />
                  <p className="mt-2 text-[11px] text-dim">
                    Example: <span className="text-muted">{fill(value)}</span>
                  </p>
                </div>
              </div>
            );
          })}
        </Panel>
      )}

      {/* ----------------------------------- FAQ ----------------------------------- */}
      {tab === "faq" && (
        <div className="mt-6 grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Panel className="max-h-[32rem] overflow-y-auto p-2" aria-label="Questions">
            <ul>
              {faqs.map((f, i) => (
                <li key={f.q}>
                  <button
                    type="button"
                    onClick={() => setFaqIndex(i)}
                    aria-current={faqIndex === i ? "true" : undefined}
                    className={`w-full rounded-xl px-4 py-3 text-left text-[13px] transition-colors focus-visible:focus-ring ${faqIndex === i ? "bg-gold/10 font-bold text-gold ring-1 ring-gold/50" : "text-text hover:bg-surface-2"}`}
                  >
                    {faqItem(i).q}
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel className="p-5 sm:p-6" aria-label="Edit question">
            <h2 className="text-base font-bold text-text">Edit question</h2>
            <div className="mt-5 space-y-4">
              <Field label="Question" value={faqItem(faqIndex).q} onChange={(e) => setDraft((d) => ({ ...d, faq: { ...(d.faq ?? config.faq), [faqIndex]: { ...faqItem(faqIndex), q: e.target.value } } }))} />
              <div>
                <label htmlFor="faq-answer" className="mb-2 block text-xs font-bold text-muted">
                  Answer
                </label>
                <textarea id="faq-answer" rows={7} value={faqItem(faqIndex).a} onChange={(e) => setDraft((d) => ({ ...d, faq: { ...(d.faq ?? config.faq), [faqIndex]: { ...faqItem(faqIndex), a: e.target.value } } }))} className={inputClass} />
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* --------------------------------- pages --------------------------------- */}
      {tab === "pages" && (
        <Panel className="mt-6 divide-y divide-line" aria-label="Website pages">
          {websitePages.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-5 sm:px-6">
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-text">{p.name}</h2>
                <p className="mt-1 text-[11px] text-dim">
                  <span className="font-mono">{p.path}</span> · updated {p.updated}
                </p>
              </div>
              <Link href={p.path} target="_blank" className="flex items-center gap-1.5 text-[13px] font-bold text-gold hover:underline">
                View page <ExternalLink size={13} aria-hidden />
              </Link>
            </div>
          ))}
        </Panel>
      )}
      <Toast message={toast} />
    </>
  );
}
