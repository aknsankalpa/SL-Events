import { PageHeader } from "@/components/ui/PageHeader";

/** Placeholder until SL Events supplies the final legal text. */
export function LegalPage({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} subtitle="Last updated: to be confirmed" />
      <div className="mx-auto max-w-3xl px-5 py-10">
        <p className="rounded-xl border border-line bg-surface p-6 text-sm leading-relaxed text-muted">
          The {title.toLowerCase()} will be published here before launch. This page is a placeholder because the text was not part of the
          design files.
        </p>
      </div>
    </>
  );
}
