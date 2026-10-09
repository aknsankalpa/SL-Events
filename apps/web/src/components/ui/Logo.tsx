import Image from "next/image";
import Link from "next/link";

type LogoProps = {
  /** Rendered height in px; width follows the 696×304 source ratio. */
  height?: number;
  href?: string;
  priority?: boolean;
};

export function Logo({ height = 60, href = "/", priority }: LogoProps) {
  const width = Math.round((height * 696) / 304);
  const image = (
    <Image
      src="/images/logo.jpg"
      alt="SL Events"
      width={width}
      height={height}
      priority={priority}
      className="rounded-md"
    />
  );
  return href ? (
    <Link href={href} aria-label="SL Events home" className="inline-flex">
      {image}
    </Link>
  ) : (
    image
  );
}
