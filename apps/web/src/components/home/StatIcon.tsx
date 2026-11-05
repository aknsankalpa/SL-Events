import Image from "next/image";

const files = { upcoming: "/icons/stats/upcoming.webp", cities: "/icons/stats/cities.webp", organizers: "/icons/stats/organizers.png" };

/** The small picture beside a number in the hero. The first two are animated, so they skip image optimisation. */
export function StatIcon({ name }: { name: keyof typeof files }) {
  return (
    <span aria-hidden className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#fff8ec]">
      <Image src={files[name]} alt="" width={36} height={36} unoptimized={name !== "organizers"} draggable={false} />
    </span>
  );
}
