import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-bold transition-colors focus-visible:focus-ring disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-gradient-to-b from-gold to-amber text-ink hover:brightness-110",
  outline: "border border-gold/60 text-gold hover:bg-gold/10",
  ghost: "text-muted hover:text-text",
  danger: "bg-danger text-white hover:brightness-110",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-[13px]",
  md: "h-11 px-6 text-sm",
  lg: "h-12 px-7 text-sm",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

type ButtonProps = CommonProps & Omit<ComponentProps<"button">, keyof CommonProps>;
type LinkButtonProps = CommonProps & { href: string } & Omit<ComponentProps<typeof Link>, keyof CommonProps | "href">;

/**
 * The colour group a utility belongs to ("text", "border", "bg", with any hover/focus prefix), or null for
 * utilities that aren't colours (font sizes, border widths). Used so a caller's override replaces the variant's
 * own class instead of fighting it: with Tailwind, two conflicting classes are resolved by stylesheet order, not
 * by the order they are written.
 */
function colorGroup(token: string): string | null {
  const m = token.match(/^((?:hover:|focus-visible:|disabled:)?)(text|border|bg)-(.+)$/);
  if (!m) return null;
  const [, state, kind, rest] = m as unknown as [string, string, "text" | "border" | "bg", string];
  if (kind === "text" && /^(xs|sm|base|lg|xl|\dxl|left|right|center|\[\d.*\])$/.test(rest)) return null;
  if (kind === "border" && /^(0|2|4|8|[tblrxyse])(-\d+)?$/.test(rest)) return null;
  return `${state}${kind}`;
}

const isBackgroundPart = (t: string) => /^(bg-gradient-|from-|to-|via-)/.test(t);

function classes({ variant = "primary", size = "md", className = "" }: CommonProps) {
  const overrides = new Set(className.split(/\s+/).map(colorGroup).filter(Boolean));
  const kept = variants[variant]
    .split(/\s+/)
    .filter((t) => {
      if (overrides.has("bg") && isBackgroundPart(t)) return false;
      const g = colorGroup(t);
      return !(g && overrides.has(g));
    })
    .join(" ");
  return `${base} ${kept} ${sizes[size]} ${className}`.trim();
}

export function Button({ variant, size, className, children, ...rest }: ButtonProps) {
  return (
    <button className={classes({ variant, size, className, children })} {...rest}>
      {children}
    </button>
  );
}

export function LinkButton({ variant, size, className, children, href, ...rest }: LinkButtonProps) {
  return (
    <Link href={href} className={classes({ variant, size, className, children })} {...rest}>
      {children}
    </Link>
  );
}
