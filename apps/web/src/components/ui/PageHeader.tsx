import Link from "next/link";
import type { ReactNode } from "react";

export type Crumb = { label: string; href?: string };

type PageHeaderProps = {
  title: ReactNode;
  eyebrow?: string;
  subtitle?: ReactNode;
  crumbs?: Crumb[];
  /** Badge or similar shown next to the title. */
  titleAside?: ReactNode;
  /** Right-aligned content, e.g. an action button. */
  actions?: ReactNode;
  /** Content under the title, e.g. the booking stepper. */
  children?: ReactNode;
  align?: "left" | "center";
};

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-muted">
      <ol className="flex flex-wrap items-center gap-x-1.5">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={`${c.label}-${i}`} className="flex items-center gap-1.5">
              {c.href && !last ? (
                <Link href={c.href} className="hover:text-gold">
                  {c.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={last ? "text-text" : undefined}>
                  {c.label}
                </span>
              )}
              {!last && <span aria-hidden>/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Dark title band with the soft gold glow on the right, used by most inner pages. */
export function PageHeader({ title, eyebrow, subtitle, crumbs, titleAside, actions, children, align = "left" }: PageHeaderProps) {
  const center = align === "center";
  return (
    <section className="border-b border-line bg-[radial-gradient(40%_120%_at_100%_0%,rgb(110_80_20/0.35),transparent_70%)]">
      <div className={`mx-auto max-w-site px-5 py-9 ${center ? "text-center" : ""}`}>
        {crumbs && <div className="mb-5"><Breadcrumbs crumbs={crumbs} /></div>}
        {eyebrow && <p className="mb-3 text-xs font-bold uppercase tracking-widest text-amber">{eyebrow}</p>}
        <div className={`flex flex-wrap items-center gap-4 ${center ? "justify-center" : "justify-between"}`}>
          <div className={`flex flex-wrap items-center gap-4 ${center ? "justify-center" : ""}`}>
            <h1 className="font-display text-[34px] font-bold leading-tight text-text sm:text-[40px]">{title}</h1>
            {titleAside}
          </div>
          {actions}
        </div>
        {subtitle && <p className={`mt-3 text-sm text-muted ${center ? "mx-auto" : ""}`}>{subtitle}</p>}
        {children}
      </div>
    </section>
  );
}
