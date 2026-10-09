export function formatKrw(amount: number): string {
  return `₩${amount.toLocaleString("en-US")}`;
}

/** "Free" for zero, otherwise the formatted won amount. */
export function formatPrice(amount: number): string {
  return amount === 0 ? "Free" : formatKrw(amount);
}
