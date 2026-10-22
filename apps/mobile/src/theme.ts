import type { CategoryId } from "@core/data";

/** Same palette as the website (apps/web/src/app/globals.css), so the app and the site look like one product. */
export const colors = {
  gold: "#f7cb60",
  amber: "#e8a83a",
  ink: "#1a1000",
  page: "#0b0907",
  surface: "#131110",
  surface2: "#1b1816",
  line: "#2c2723",
  text: "#f6f2ea",
  muted: "#aca69b",
  dim: "#7a756c",
  success: "#3fb984",
  danger: "#e5484d",
  warning: "#f5a524",
} as const;

export const fonts = {
  regular: "Montserrat_400Regular",
  medium: "Montserrat_500Medium",
  bold: "Montserrat_700Bold",
  display: "Cinzel_700Bold",
} as const;

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** Cover colours per category, the same gradients as the website's event covers. */
export const coverColors: Record<CategoryId, [string, string, string]> = {
  concert: ["#4a0d0d", "#a31616", "#e0281f"],
  party: ["#3a0a0a", "#8c1414", "#d4381f"],
  cricket: ["#7a3b0b", "#c4781c", "#f2c25a"],
  culture: ["#8c1a14", "#c8501f", "#e8a83a"],
  movies: ["#5a0e0e", "#b0301a", "#e8a83a"],
  food: ["#8a4a10", "#c8841f", "#f7cb60"],
  travel: ["#0e3a4a", "#1d6f86", "#e8a83a"],
  community: ["#2a0808", "#6a1212", "#4a2410"],
};

/** Icon colour that stays readable on each cover (the gold covers need a dark icon). */
export const coverIconColor = (id: CategoryId) => (id === "cricket" || id === "food" ? "rgba(0,0,0,0.75)" : "#ffffff");

export const toneColor = {
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
  neutral: colors.muted,
} as const;
