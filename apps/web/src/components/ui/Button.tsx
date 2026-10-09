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

function classes({ variant = "primary", size = "md", className = "" }: CommonProps) {
  return `${base} ${variants[variant]} ${sizes[size]} ${className}`;
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
