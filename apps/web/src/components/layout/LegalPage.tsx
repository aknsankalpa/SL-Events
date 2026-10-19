import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";

export type LegalSection = { id: string; title: string; body: string[] };

type Props = { title: string; updated: string; intro: string; sections: LegalSection[] };

/** A legal page: short intro, a contents list and numbered sections. The text lives with each page. */
export function LegalPage({ title, updated, intro, sections }: Props) {
  return (
    <>
      <PageHeader title={title} subtitle={`Last updated: ${updated}`} />
      <div className="mx-auto grid max-w-5xl items-start gap-10 px-5 py-10 lg:grid-cols-[14rem_1fr]">
        <nav aria-label="On this page" className="rounded-xl border border-line bg-surface p-4 lg:sticky lg:top-[108px]">
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted">On this page</h2>
          <ol className="space-y-2 text-[13px]">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-muted transition-colors hover:text-gold">
                  {i + 1}. {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="min-w-0">
          <p className="rounded-xl border border-line bg-surface p-5 text-sm leading-relaxed text-muted">{intro}</p>
          <p className="mt-3 text-[11px] text-dim">
            This is the working draft of our {title.toLowerCase()}. It is being reviewed before launch, and we will update it here.
            Questions? <Link href="/contact" className="font-bold text-amber hover:text-gold">Contact us</Link>.
          </p>

          <div className="mt-8 space-y-9">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-28">
                <h2 className="text-xl font-bold text-text">
                  {i + 1}. {s.title}
                </h2>
                <div className="mt-3 space-y-3 text-[14px] leading-relaxed text-muted">
                  {s.body.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>
      </div>
    </>
  );
}
