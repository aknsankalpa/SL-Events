import {
  Clapperboard,
  Drama,
  Headphones,
  Mic2,
  Plane,
  Trophy,
  UtensilsCrossed,
  Users,
  type LucideProps,
} from "lucide-react";
import type { CategoryId } from "@/lib/data";

const icons = {
  concert: Mic2,
  party: Headphones,
  cricket: Trophy,
  culture: Drama,
  movies: Clapperboard,
  food: UtensilsCrossed,
  travel: Plane,
  community: Users,
} satisfies Record<CategoryId, React.ComponentType<LucideProps>>;

export function CategoryIcon({ id, ...props }: { id: CategoryId } & LucideProps) {
  const Icon = icons[id];
  return <Icon aria-hidden {...props} />;
}

/** Cover gradients per category until real event photos are uploaded. */
export const coverGradients: Record<CategoryId, string> = {
  concert: "from-[#4a0d0d] via-[#a31616] to-[#e0281f]",
  party: "from-[#3a0a0a] via-[#8c1414] to-[#d4381f]",
  cricket: "from-[#7a3b0b] via-[#c4781c] to-[#f2c25a]",
  culture: "from-[#8c1a14] via-[#c8501f] to-[#e8a83a]",
  movies: "from-[#5a0e0e] via-[#b0301a] to-[#e8a83a]",
  food: "from-[#8a4a10] via-[#c8841f] to-[#f7cb60]",
  travel: "from-[#0e3a4a] via-[#1d6f86] to-[#e8a83a]",
  community: "from-[#2a0808] via-[#6a1212] to-[#4a2410]",
};

/** Icon colour that stays readable on each cover gradient (gold covers need a dark icon). */
export function coverIconClass(id: CategoryId) {
  return id === "cricket" || id === "food" ? "text-black/75" : "text-white";
}
